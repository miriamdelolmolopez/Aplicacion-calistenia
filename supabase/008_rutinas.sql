-- Fase 5 · Parte B2: rutinas, acceso del alumno y planes online
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. PLANES ONLINE EN EL CATÁLOGO DE BONOS (se activan solo al cobrarse; no cuentan clases)
insert into public.tipos_bono (nombre, servicio, clases, validez_dias, precio_centimos, requiere_pago, orden)
values
  ('Online mensual (alumnos actuales)', 'online', 1, 30, 7900, true, 10),
  ('Online mensual (alumnos nuevos)', 'online', 1, 30, 9700, true, 11),
  ('Online bimestral', 'online', 1, 60, 19000, true, 12),
  ('Online trimestral', 'online', 1, 90, 28000, true, 13),
  ('Online semestral', 'online', 1, 180, 54000, true, 14)
on conflict (nombre) do nothing;

-- 2. RUTINAS -------------------------------------------------------------------
-- user_id vacío = plantilla. Estados: borrador, publicada (una por alumno), historial.
create table if not exists public.rutinas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 80),
  nota text check (nota is null or char_length(nota) <= 1000),
  estado text not null default 'borrador' check (estado in ('borrador', 'publicada', 'historial')),
  entrenos_semana int check (entrenos_semana is null or entrenos_semana between 1 and 14),
  publicada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint plantilla_siempre_borrador check (user_id is not null or estado = 'borrador')
);

create unique index if not exists rutinas_una_publicada
  on public.rutinas (user_id) where estado = 'publicada';
create index if not exists rutinas_user on public.rutinas (user_id);

create table if not exists public.rutina_sesiones (
  id uuid primary key default gen_random_uuid(),
  rutina_id uuid not null references public.rutinas (id) on delete cascade,
  orden int not null default 0,
  nombre text not null check (char_length(nombre) between 1 and 80),
  nota text check (nota is null or char_length(nota) <= 1000),
  creado_en timestamptz not null default now()
);
create index if not exists rutina_sesiones_rutina on public.rutina_sesiones (rutina_id);

-- "grupo": los ejercicios consecutivos con el mismo número forman una superserie.
-- El descanso de una superserie es el del último ejercicio del grupo.
create table if not exists public.rutina_items (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.rutina_sesiones (id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios (id) on delete restrict,
  orden int not null default 0,
  series int not null default 3 check (series between 1 and 20),
  reps_min int check (reps_min is null or reps_min between 1 and 500),
  reps_max int check (reps_max is null or reps_max between 1 and 500),
  segundos_min int check (segundos_min is null or segundos_min between 1 and 7200),
  segundos_max int check (segundos_max is null or segundos_max between 1 and 7200),
  peso_kg numeric(6, 2) check (peso_kg is null or peso_kg between 0 and 500),
  distancia_m int check (distancia_m is null or distancia_m between 1 and 100000),
  descanso_seg int not null default 60 check (descanso_seg between 0 and 900),
  nota text check (nota is null or char_length(nota) <= 300),
  grupo int,
  creado_en timestamptz not null default now(),
  constraint reps_rango check (reps_max is null or reps_min is null or reps_max >= reps_min),
  constraint segundos_rango check (segundos_max is null or segundos_min is null or segundos_max >= segundos_min)
);
create index if not exists rutina_items_sesion on public.rutina_items (sesion_id);
create index if not exists rutina_items_ejercicio on public.rutina_items (ejercicio_id);

-- 3. FUNCIONES DE ACCESO ----------------------------------------------------------

-- ¿Tiene esta persona un plan online activo (pagado y sin caducar)?
create or replace function public.tiene_plan_online(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bonos b
    where b.user_id = p_user
      and b.servicio = 'online'
      and b.estado = 'activo'
      and (b.caduca_en is null or b.caduca_en > now())
  );
$$;

create or replace function public.mi_plan_online()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then false else public.tiene_plan_online(auth.uid()) end;
$$;

-- ¿Puede la persona que consulta ver esta rutina? (suya, publicada o historial, con plan activo)
create or replace function public.rutina_visible(p_rutina uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.rutinas r
    where r.id = p_rutina
      and r.user_id = auth.uid()
      and r.estado in ('publicada', 'historial')
      and public.tiene_plan_online(auth.uid())
  );
$$;

create or replace function public.sesion_visible(p_sesion uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rutina_sesiones s
    where s.id = p_sesion and public.rutina_visible(s.rutina_id)
  );
$$;

-- Un alumno solo ve los ejercicios (y su material) que llevan sus rutinas visibles.
create or replace function public.ejercicio_visible(p_ejercicio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.rutina_items i
    join public.rutina_sesiones s on s.id = i.sesion_id
    where i.ejercicio_id = p_ejercicio and public.rutina_visible(s.rutina_id)
  );
$$;

create or replace function public.material_visible(p_material uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ejercicio_materiales em
    where em.material_id = p_material and public.ejercicio_visible(em.ejercicio_id)
  );
$$;

-- 4. FUNCIONES DE EDICIÓN (solo las usa la parte privada de la app) ------------------

-- Ordena los ejercicios de una sesión y arregla las superseries:
-- un grupo solo vale si sus ejercicios están seguidos y son al menos dos.
create or replace function public.normalizar_grupos(p_sesion uuid)
returns void
language sql
security definer
set search_path = public
as $$
  with ordenados as (
    select id, grupo,
           row_number() over (order by orden, creado_en, id) as pos
    from public.rutina_items where sesion_id = p_sesion
  ), marcas as (
    select id, grupo, pos,
           case when grupo is not null
                     and grupo is not distinct from lag(grupo) over (order by pos)
                then 0 else 1 end as inicio
    from ordenados
  ), rachas as (
    select id, grupo, pos, sum(inicio) over (order by pos) as racha from marcas
  ), tamanos as (
    select id, grupo, racha, count(*) over (partition by racha) as n from rachas
  )
  update public.rutina_items i
  set grupo = case when t.grupo is null or t.n < 2 then null else t.racha::int end
  from tamanos t
  where i.id = t.id;
$$;

create or replace function public.agregar_sesion(p_rutina uuid, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva uuid;
begin
  if not exists (select 1 from public.rutinas where id = p_rutina) then
    raise exception 'Rutina no encontrada';
  end if;
  insert into public.rutina_sesiones (rutina_id, orden, nombre)
  values (
    p_rutina,
    coalesce((select max(orden) from public.rutina_sesiones where rutina_id = p_rutina), 0) + 1,
    p_nombre
  )
  returning id into nueva;
  update public.rutinas set actualizado_en = now() where id = p_rutina;
  return nueva;
end;
$$;

create or replace function public.agregar_item(p_sesion uuid, p_ejercicio uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo uuid;
  tipo_ej text;
  rutina uuid;
begin
  select rutina_id into rutina from public.rutina_sesiones where id = p_sesion;
  if rutina is null then
    raise exception 'Sesión no encontrada';
  end if;
  select tipo into tipo_ej from public.ejercicios where id = p_ejercicio and activo;
  if tipo_ej is null then
    raise exception 'Ejercicio no válido';
  end if;

  insert into public.rutina_items (sesion_id, ejercicio_id, orden, series, reps_min, segundos_min, distancia_m)
  values (
    p_sesion, p_ejercicio,
    coalesce((select max(orden) from public.rutina_items where sesion_id = p_sesion), 0) + 1,
    3,
    case when tipo_ej in ('repeticiones', 'peso_corporal_lastre', 'repeticiones_peso', 'peso_corporal_asistido') then 8 end,
    case when tipo_ej = 'duracion' then 20 end,
    case when tipo_ej in ('distancia_duracion', 'peso_distancia') then 20 end
  )
  returning id into nuevo;

  update public.rutinas set actualizado_en = now() where id = rutina;
  return nuevo;
end;
$$;

create or replace function public.quitar_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sesion uuid;
begin
  delete from public.rutina_items where id = p_item returning sesion_id into sesion;
  if sesion is null then
    raise exception 'Ejercicio no encontrado';
  end if;
  perform public.normalizar_grupos(sesion);
end;
$$;

create or replace function public.reordenar_items(p_sesion uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.rutina_items where sesion_id = p_sesion) <> coalesce(array_length(p_ids, 1), 0)
     or exists (
       select 1 from unnest(p_ids) as x
       where not exists (select 1 from public.rutina_items where id = x and sesion_id = p_sesion)
     ) then
    raise exception 'La lista de ejercicios no coincide con la sesión';
  end if;

  update public.rutina_items i
  set orden = o.pos
  from unnest(p_ids) with ordinality as o (id, pos)
  where i.id = o.id;

  perform public.normalizar_grupos(p_sesion);
end;
$$;

create or replace function public.reordenar_sesiones(p_rutina uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.rutina_sesiones where rutina_id = p_rutina) <> coalesce(array_length(p_ids, 1), 0)
     or exists (
       select 1 from unnest(p_ids) as x
       where not exists (select 1 from public.rutina_sesiones where id = x and rutina_id = p_rutina)
     ) then
    raise exception 'La lista de sesiones no coincide con la rutina';
  end if;

  update public.rutina_sesiones s
  set orden = o.pos
  from unnest(p_ids) with ordinality as o (id, pos)
  where s.id = o.id;
end;
$$;

-- Une un ejercicio con el anterior en una superserie.
create or replace function public.unir_con_anterior(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it record;
  previo record;
  nuevo int;
begin
  select * into it from public.rutina_items where id = p_item;
  if not found then
    raise exception 'Ejercicio no encontrado';
  end if;

  select * into previo from public.rutina_items
  where sesion_id = it.sesion_id
    and (orden, creado_en, id) < (it.orden, it.creado_en, it.id)
  order by orden desc, creado_en desc, id desc
  limit 1;
  if not found then
    raise exception 'No hay un ejercicio anterior con el que unirlo';
  end if;

  nuevo := coalesce(
    previo.grupo,
    (select coalesce(max(grupo), 0) + 1 from public.rutina_items where sesion_id = it.sesion_id)
  );
  update public.rutina_items set grupo = nuevo where id in (previo.id, it.id);
  perform public.normalizar_grupos(it.sesion_id);
end;
$$;

create or replace function public.separar_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sesion uuid;
begin
  update public.rutina_items set grupo = null where id = p_item returning sesion_id into sesion;
  if sesion is null then
    raise exception 'Ejercicio no encontrado';
  end if;
  perform public.normalizar_grupos(sesion);
end;
$$;

-- Publica una rutina: la anterior publicada del alumno pasa a historial.
create or replace function public.publicar_rutina(p_rutina uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.rutinas where id = p_rutina for update;
  if not found then
    raise exception 'Rutina no encontrada';
  end if;
  if r.user_id is null then
    raise exception 'Una plantilla no se publica: cópiala a un alumno';
  end if;
  if r.estado = 'publicada' then
    return;
  end if;
  if not exists (
    select 1 from public.rutina_items i
    join public.rutina_sesiones s on s.id = i.sesion_id
    where s.rutina_id = p_rutina
  ) then
    raise exception 'La rutina no tiene ningún ejercicio';
  end if;

  update public.rutinas
  set estado = 'historial', actualizado_en = now()
  where user_id = r.user_id and estado = 'publicada' and id <> p_rutina;

  update public.rutinas
  set estado = 'publicada', publicada_en = now(), actualizado_en = now()
  where id = p_rutina;
end;
$$;

-- Vuelve a borrador (el alumno deja de verla).
create or replace function public.despublicar_rutina(p_rutina uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rutinas
  set estado = 'borrador', actualizado_en = now()
  where id = p_rutina and estado in ('publicada', 'historial');
end;
$$;

-- Copia una rutina completa (sesiones, ejercicios y superseries) a otro alumno
-- o como plantilla (p_user_destino vacío). La copia nace como borrador.
create or replace function public.duplicar_rutina(p_rutina uuid, p_user_destino uuid, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  s record;
  nueva uuid;
  nueva_sesion uuid;
begin
  select * into r from public.rutinas where id = p_rutina;
  if not found then
    raise exception 'Rutina no encontrada';
  end if;
  if p_user_destino is not null
     and not exists (select 1 from public.profiles where id = p_user_destino and rol = 'alumno') then
    raise exception 'La persona debe ser alumno';
  end if;

  insert into public.rutinas (user_id, nombre, nota, entrenos_semana, estado)
  values (
    p_user_destino,
    coalesce(nullif(trim(p_nombre), ''), r.nombre || ' (copia)'),
    r.nota,
    r.entrenos_semana,
    'borrador'
  )
  returning id into nueva;

  for s in select * from public.rutina_sesiones where rutina_id = p_rutina order by orden loop
    insert into public.rutina_sesiones (rutina_id, orden, nombre, nota)
    values (nueva, s.orden, s.nombre, s.nota)
    returning id into nueva_sesion;

    insert into public.rutina_items (
      sesion_id, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max,
      peso_kg, distancia_m, descanso_seg, nota, grupo
    )
    select nueva_sesion, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max,
           peso_kg, distancia_m, descanso_seg, nota, grupo
    from public.rutina_items where sesion_id = s.id;
  end loop;

  return nueva;
end;
$$;

revoke all on function public.tiene_plan_online(uuid) from public, anon, authenticated;
revoke all on function public.rutina_visible(uuid) from public, anon, authenticated;
revoke all on function public.sesion_visible(uuid) from public, anon, authenticated;
revoke all on function public.ejercicio_visible(uuid) from public, anon, authenticated;
revoke all on function public.material_visible(uuid) from public, anon, authenticated;
revoke all on function public.mi_plan_online() from public, anon;
revoke all on function public.normalizar_grupos(uuid) from public, anon, authenticated;
revoke all on function public.agregar_sesion(uuid, text) from public, anon, authenticated;
revoke all on function public.agregar_item(uuid, uuid) from public, anon, authenticated;
revoke all on function public.quitar_item(uuid) from public, anon, authenticated;
revoke all on function public.reordenar_items(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reordenar_sesiones(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.unir_con_anterior(uuid) from public, anon, authenticated;
revoke all on function public.separar_item(uuid) from public, anon, authenticated;
revoke all on function public.publicar_rutina(uuid) from public, anon, authenticated;
revoke all on function public.despublicar_rutina(uuid) from public, anon, authenticated;
revoke all on function public.duplicar_rutina(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.mi_plan_online() to authenticated;
-- Estas cuatro las usan las reglas de seguridad con la sesión del alumno; solo responden
-- "sí o no" sobre lo que la propia persona puede ver.
grant execute on function public.rutina_visible(uuid) to authenticated;
grant execute on function public.sesion_visible(uuid) to authenticated;
grant execute on function public.ejercicio_visible(uuid) to authenticated;
grant execute on function public.material_visible(uuid) to authenticated;
grant execute on function public.tiene_plan_online(uuid) to service_role;
grant execute on function public.normalizar_grupos(uuid) to service_role;
grant execute on function public.agregar_sesion(uuid, text) to service_role;
grant execute on function public.agregar_item(uuid, uuid) to service_role;
grant execute on function public.quitar_item(uuid) to service_role;
grant execute on function public.reordenar_items(uuid, uuid[]) to service_role;
grant execute on function public.reordenar_sesiones(uuid, uuid[]) to service_role;
grant execute on function public.unir_con_anterior(uuid) to service_role;
grant execute on function public.separar_item(uuid) to service_role;
grant execute on function public.publicar_rutina(uuid) to service_role;
grant execute on function public.despublicar_rutina(uuid) to service_role;
grant execute on function public.duplicar_rutina(uuid, uuid, text) to service_role;

-- 5. SEGURIDAD ------------------------------------------------------------------------
-- La administradora lo ve todo. Un alumno con plan online activo solo ve SUS rutinas
-- publicadas y en historial (nunca borradores), y solo los ejercicios que llevan.
-- Nadie escribe desde el navegador.
alter table public.rutinas enable row level security;
alter table public.rutina_sesiones enable row level security;
alter table public.rutina_items enable row level security;

revoke all on public.rutinas from anon, authenticated;
revoke all on public.rutina_sesiones from anon, authenticated;
revoke all on public.rutina_items from anon, authenticated;
grant select on public.rutinas to authenticated;
grant select on public.rutina_sesiones to authenticated;
grant select on public.rutina_items to authenticated;

drop policy if exists rutinas_ver on public.rutinas;
create policy rutinas_ver on public.rutinas
  for select to authenticated
  using ((select public.es_admin()) or (select public.rutina_visible(id)));

drop policy if exists rutina_sesiones_ver on public.rutina_sesiones;
create policy rutina_sesiones_ver on public.rutina_sesiones
  for select to authenticated
  using ((select public.es_admin()) or (select public.rutina_visible(rutina_id)));

drop policy if exists rutina_items_ver on public.rutina_items;
create policy rutina_items_ver on public.rutina_items
  for select to authenticated
  using ((select public.es_admin()) or (select public.sesion_visible(sesion_id)));

drop policy if exists ejercicios_alumno_ver on public.ejercicios;
create policy ejercicios_alumno_ver on public.ejercicios
  for select to authenticated using ((select public.ejercicio_visible(id)));

drop policy if exists ejercicio_musculos_alumno_ver on public.ejercicio_musculos;
create policy ejercicio_musculos_alumno_ver on public.ejercicio_musculos
  for select to authenticated using ((select public.ejercicio_visible(ejercicio_id)));

drop policy if exists ejercicio_materiales_alumno_ver on public.ejercicio_materiales;
create policy ejercicio_materiales_alumno_ver on public.ejercicio_materiales
  for select to authenticated using ((select public.ejercicio_visible(ejercicio_id)));

drop policy if exists materiales_alumno_ver on public.materiales;
create policy materiales_alumno_ver on public.materiales
  for select to authenticated using ((select public.material_visible(id)));
