-- Fase 5 · Parte C: entrenos y series anotadas
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. ENTRENOS (uno por vez que el alumno entrena una sesión) ---------------------
create table if not exists public.entrenos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rutina_id uuid references public.rutinas (id) on delete set null,
  sesion_id uuid references public.rutina_sesiones (id) on delete set null,
  nombre_rutina text not null,
  nombre_sesion text not null,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'terminado', 'descartado')),
  empezado_en timestamptz not null default now(),
  terminado_en timestamptz,
  duracion_seg int check (duracion_seg is null or duracion_seg between 0 and 86400),
  resumen jsonb,
  creado_en timestamptz not null default now()
);

-- Solo un entreno en curso por alumno.
create unique index if not exists entrenos_uno_en_curso
  on public.entrenos (user_id) where estado = 'en_curso';
create index if not exists entrenos_user_fecha on public.entrenos (user_id, empezado_en desc);

-- 2. SERIES ANOTADAS ---------------------------------------------------------------
-- Cada fila lleva una copia de lo pautado (obj_*), para que el historial no cambie
-- aunque se edite la rutina.
create table if not exists public.entreno_series (
  id uuid primary key default gen_random_uuid(),
  entreno_id uuid not null references public.entrenos (id) on delete cascade,
  item_id uuid references public.rutina_items (id) on delete set null,
  ejercicio_id uuid references public.ejercicios (id) on delete set null,
  nombre_ejercicio text not null,
  tipo text not null,
  orden_ejercicio int not null,
  numero int not null check (numero >= 1),
  grupo int,
  descanso_seg int not null default 60 check (descanso_seg between 0 and 900),
  nota_objetivo text,
  obj_reps_min int,
  obj_reps_max int,
  obj_segundos_min int,
  obj_segundos_max int,
  obj_peso_kg numeric(6, 2),
  obj_distancia_m int,
  reps int check (reps is null or reps between 0 and 1000),
  segundos int check (segundos is null or segundos between 0 and 86400),
  peso_kg numeric(6, 2) check (peso_kg is null or peso_kg between 0 and 1000),
  distancia_m int check (distancia_m is null or distancia_m between 0 and 1000000),
  detalle text check (detalle is null or char_length(detalle) <= 60),
  completada boolean not null default false,
  completada_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (entreno_id, orden_ejercicio, numero)
);
create index if not exists entreno_series_entreno on public.entreno_series (entreno_id);
create index if not exists entreno_series_ejercicio on public.entreno_series (ejercicio_id);

-- 3. FUNCIONES (solo las usa la parte privada de la app, en nombre del alumno) --------

create or replace function public.iniciar_entreno(p_user uuid, p_sesion uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ses record;
  rut record;
  it record;
  nuevo uuid;
  pos int := 0;
  n int;
begin
  if not public.tiene_plan_online(p_user) then
    raise exception 'Tu plan online no está activo';
  end if;

  select * into ses from public.rutina_sesiones where id = p_sesion;
  if not found then
    raise exception 'Sesión no encontrada';
  end if;
  select * into rut from public.rutinas where id = ses.rutina_id;
  if rut.user_id is distinct from p_user or rut.estado <> 'publicada' then
    raise exception 'Solo puedes entrenar sesiones de tu rutina publicada';
  end if;
  if exists (select 1 from public.entrenos where user_id = p_user and estado = 'en_curso') then
    raise exception 'Ya tienes un entreno en curso';
  end if;
  if not exists (select 1 from public.rutina_items where sesion_id = p_sesion) then
    raise exception 'La sesión no tiene ejercicios';
  end if;

  insert into public.entrenos (user_id, rutina_id, sesion_id, nombre_rutina, nombre_sesion)
  values (p_user, rut.id, ses.id, rut.nombre, ses.nombre)
  returning id into nuevo;

  for it in
    select i.*, e.nombre as nombre_ej, e.tipo as tipo_ej
    from public.rutina_items i
    join public.ejercicios e on e.id = i.ejercicio_id
    where i.sesion_id = p_sesion
    order by i.orden, i.creado_en, i.id
  loop
    pos := pos + 1;
    for n in 1..it.series loop
      insert into public.entreno_series (
        entreno_id, item_id, ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero,
        grupo, descanso_seg, nota_objetivo,
        obj_reps_min, obj_reps_max, obj_segundos_min, obj_segundos_max, obj_peso_kg, obj_distancia_m
      )
      values (
        nuevo, it.id, it.ejercicio_id, it.nombre_ej, it.tipo_ej, pos, n,
        it.grupo, it.descanso_seg, it.nota,
        it.reps_min, it.reps_max, it.segundos_min, it.segundos_max, it.peso_kg, it.distancia_m
      );
    end loop;
  end loop;

  return nuevo;
exception
  when unique_violation then
    raise exception 'Ya tienes un entreno en curso';
end;
$$;

create or replace function public.guardar_serie(
  p_user uuid, p_serie uuid,
  p_reps int, p_segundos int, p_peso numeric, p_distancia int, p_detalle text,
  p_completada boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  encontrada uuid;
begin
  update public.entreno_series s
  set reps = p_reps,
      segundos = p_segundos,
      peso_kg = p_peso,
      distancia_m = p_distancia,
      detalle = nullif(trim(p_detalle), ''),
      completada = coalesce(p_completada, false),
      completada_en = case
        when coalesce(p_completada, false) then coalesce(s.completada_en, now())
        else null
      end
  from public.entrenos e
  where s.id = p_serie
    and e.id = s.entreno_id
    and e.user_id = p_user
    and e.estado = 'en_curso'
  returning s.id into encontrada;

  if encontrada is null then
    raise exception 'Serie no encontrada o entreno ya terminado';
  end if;
end;
$$;

-- Añade una serie extra a un ejercicio del entreno en curso (copia la última serie).
create or replace function public.agregar_serie(p_user uuid, p_entreno uuid, p_orden_ejercicio int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ultima record;
  nueva uuid;
begin
  if not exists (
    select 1 from public.entrenos where id = p_entreno and user_id = p_user and estado = 'en_curso'
  ) then
    raise exception 'Entreno no encontrado o ya terminado';
  end if;

  select * into ultima from public.entreno_series
  where entreno_id = p_entreno and orden_ejercicio = p_orden_ejercicio
  order by numero desc limit 1;
  if not found then
    raise exception 'Ejercicio no encontrado';
  end if;
  if ultima.numero >= 20 then
    raise exception 'No se pueden añadir más de 20 series';
  end if;

  insert into public.entreno_series (
    entreno_id, item_id, ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero,
    grupo, descanso_seg, nota_objetivo,
    obj_reps_min, obj_reps_max, obj_segundos_min, obj_segundos_max, obj_peso_kg, obj_distancia_m
  )
  values (
    p_entreno, ultima.item_id, ultima.ejercicio_id, ultima.nombre_ejercicio, ultima.tipo,
    ultima.orden_ejercicio, ultima.numero + 1,
    ultima.grupo, ultima.descanso_seg, ultima.nota_objetivo,
    ultima.obj_reps_min, ultima.obj_reps_max, ultima.obj_segundos_min, ultima.obj_segundos_max,
    ultima.obj_peso_kg, ultima.obj_distancia_m
  )
  returning id into nueva;
  return nueva;
end;
$$;

-- Quita una serie que no se ha completado (si no es la única del ejercicio).
create or replace function public.quitar_serie(p_user uuid, p_serie uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
begin
  select ser.* into s
  from public.entreno_series ser
  join public.entrenos e on e.id = ser.entreno_id
  where ser.id = p_serie and e.user_id = p_user and e.estado = 'en_curso';
  if not found then
    raise exception 'Serie no encontrada o entreno ya terminado';
  end if;
  if s.completada then
    raise exception 'No se puede quitar una serie ya completada';
  end if;
  if (select count(*) from public.entreno_series
      where entreno_id = s.entreno_id and orden_ejercicio = s.orden_ejercicio) <= 1 then
    raise exception 'El ejercicio necesita al menos una serie';
  end if;
  delete from public.entreno_series where id = p_serie;
end;
$$;

-- Termina el entreno: guarda la duración y un resumen (músculos realmente trabajados).
create or replace function public.finalizar_entreno(p_user uuid, p_entreno uuid, p_duracion_seg int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  transcurrido int;
  hechas int;
  total int;
  n_ejercicios int;
  intens jsonb;
  resumen_json jsonb;
begin
  select * into e from public.entrenos
  where id = p_entreno and user_id = p_user and estado = 'en_curso'
  for update;
  if not found then
    raise exception 'Entreno no encontrado o ya terminado';
  end if;

  transcurrido := extract(epoch from (now() - e.empezado_en))::int;
  if p_duracion_seg is not null and (p_duracion_seg < 1 or p_duracion_seg > transcurrido + 5) then
    raise exception 'La duración no es válida';
  end if;

  select count(*) filter (where completada), count(*),
         count(distinct orden_ejercicio) filter (where completada)
  into hechas, total, n_ejercicios
  from public.entreno_series where entreno_id = p_entreno;
  if hechas = 0 then
    raise exception 'No has completado ninguna serie';
  end if;

  with por_ejercicio as (
    select ejercicio_id, count(*) as n
    from public.entreno_series
    where entreno_id = p_entreno and completada and ejercicio_id is not null
    group by ejercicio_id
  ), pesos as (
    select m.musculo,
           sum(pe.n * case when m.rol = 'principal' then 3 else 1 end) as v
    from por_ejercicio pe
    join public.ejercicio_musculos m on m.ejercicio_id = pe.ejercicio_id
    group by m.musculo
  ), maximo as (
    select max(v) as mx from pesos
  )
  select coalesce(
           jsonb_object_agg(p.musculo, greatest(1, round(5.0 * p.v / mx.mx)::int)),
           '{}'::jsonb
         )
  into intens
  from pesos p cross join maximo mx;

  resumen_json := jsonb_build_object(
    'series_hechas', hechas,
    'series_total', total,
    'ejercicios', n_ejercicios,
    'intensidades', coalesce(intens, '{}'::jsonb)
  );

  update public.entrenos
  set estado = 'terminado',
      terminado_en = now(),
      duracion_seg = least(coalesce(p_duracion_seg, transcurrido), 86400),
      resumen = resumen_json
  where id = p_entreno;

  return resumen_json;
end;
$$;

create or replace function public.descartar_entreno(p_user uuid, p_entreno uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.entrenos
  set estado = 'descartado', terminado_en = now()
  where id = p_entreno and user_id = p_user and estado = 'en_curso';
  if not found then
    raise exception 'Entreno no encontrado o ya terminado';
  end if;
end;
$$;

-- "La última vez": las series completadas del entreno anterior de cada ejercicio.
create or replace function public.ultima_vez(p_ejercicios uuid[])
returns table (
  ejercicio_id uuid,
  numero int,
  reps int,
  segundos int,
  peso_kg numeric,
  distancia_m int,
  detalle text
)
language sql
stable
security definer
set search_path = public
as $$
  with ultimos as (
    select distinct on (s.ejercicio_id) s.ejercicio_id as ej, e.id as entreno
    from public.entreno_series s
    join public.entrenos e on e.id = s.entreno_id
    where auth.uid() is not null
      and public.mi_plan_online()
      and e.user_id = auth.uid()
      and e.estado = 'terminado'
      and s.completada
      and s.ejercicio_id = any (p_ejercicios)
    order by s.ejercicio_id, e.empezado_en desc
  )
  select s.ejercicio_id, s.numero, s.reps, s.segundos, s.peso_kg, s.distancia_m, s.detalle
  from ultimos u
  join public.entreno_series s on s.entreno_id = u.entreno and s.ejercicio_id = u.ej and s.completada
  order by s.ejercicio_id, s.numero;
$$;

revoke all on function public.iniciar_entreno(uuid, uuid) from public, anon, authenticated;
revoke all on function public.guardar_serie(uuid, uuid, int, int, numeric, int, text, boolean) from public, anon, authenticated;
revoke all on function public.agregar_serie(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.quitar_serie(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalizar_entreno(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.descartar_entreno(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ultima_vez(uuid[]) from public, anon;

grant execute on function public.iniciar_entreno(uuid, uuid) to service_role;
grant execute on function public.guardar_serie(uuid, uuid, int, int, numeric, int, text, boolean) to service_role;
grant execute on function public.agregar_serie(uuid, uuid, int) to service_role;
grant execute on function public.quitar_serie(uuid, uuid) to service_role;
grant execute on function public.finalizar_entreno(uuid, uuid, int) to service_role;
grant execute on function public.descartar_entreno(uuid, uuid) to service_role;
grant execute on function public.ultima_vez(uuid[]) to authenticated;

-- 4. SEGURIDAD ----------------------------------------------------------------------
-- Cada alumno solo ve SUS entrenos y mientras su plan online esté activo; la
-- administradora ve todos. Nadie escribe desde el navegador.
alter table public.entrenos enable row level security;
alter table public.entreno_series enable row level security;

revoke all on public.entrenos from anon, authenticated;
revoke all on public.entreno_series from anon, authenticated;
grant select on public.entrenos to authenticated;
grant select on public.entreno_series to authenticated;

drop policy if exists entrenos_ver on public.entrenos;
create policy entrenos_ver on public.entrenos
  for select to authenticated
  using (
    (select public.es_admin())
    or (user_id = (select auth.uid()) and (select public.mi_plan_online()))
  );

drop policy if exists entreno_series_ver on public.entreno_series;
create policy entreno_series_ver on public.entreno_series
  for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1 from public.entrenos e
      where e.id = entreno_id
        and e.user_id = (select auth.uid())
        and (select public.mi_plan_online())
    )
  );
