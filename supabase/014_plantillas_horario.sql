-- Bloque 4A · Plantillas de horario
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes: el horario actual se convierte en la plantilla "Horario normal".

-- 1. PLANTILLAS ---------------------------------------------------------------------
create table if not exists public.plantillas_horario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  principal boolean not null default false,
  creada_en timestamptz not null default now()
);
create unique index if not exists plantillas_nombre_unico on public.plantillas_horario (lower(nombre));
-- Solo una plantilla principal: la que usa el botón «Crear clases».
create unique index if not exists plantillas_una_principal on public.plantillas_horario (principal) where principal;

create table if not exists public.plantilla_clases (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references public.plantillas_horario (id) on delete cascade,
  tipo_id uuid not null references public.tipos_clase (id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 7), -- 1 = lunes ... 7 = domingo
  hora time not null,
  plazas int check (plazas is null or plazas between 1 and 100), -- vacío = las del tipo de clase
  unique (plantilla_id, tipo_id, dia_semana, hora)
);
create index if not exists plantilla_clases_plantilla on public.plantilla_clases (plantilla_id);

-- El horario que ya existía pasa a ser la primera plantilla (solo la primera vez).
insert into public.plantillas_horario (nombre, principal)
select 'Horario normal', true
where not exists (select 1 from public.plantillas_horario);

insert into public.plantilla_clases (plantilla_id, tipo_id, dia_semana, hora)
select p.id, h.tipo_id, h.dia_semana, h.hora
from public.horario_semanal h
cross join (select id from public.plantillas_horario where principal limit 1) p
where h.activo
  and not exists (select 1 from public.plantilla_clases)
on conflict do nothing;

-- 2. CREAR CLASES A PARTIR DE UNA PLANTILLA ---------------------------------------------
-- Solo añade las que faltan (no toca las que ya existen ni sus reservas) y nunca en el pasado.
create or replace function public.crear_clases_rango(p_plantilla uuid, p_desde date, p_hasta date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas int := 0;
  nuevas int;
  dia date;
  fila record;
  inicio timestamptz;
begin
  for dia in select generate_series(p_desde, p_hasta, interval '1 day')::date
  loop
    for fila in
      select c.hora, t.id as tipo_id, coalesce(c.plazas, t.plazas_max) as plazas, t.plazas_prueba
      from public.plantilla_clases c
      join public.tipos_clase t on t.id = c.tipo_id
      where c.plantilla_id = p_plantilla
        and t.activo
        and c.dia_semana = extract(isodow from dia)
    loop
      inicio := (dia + fila.hora) at time zone 'Europe/Madrid';
      if inicio > now() then
        insert into public.sesiones_clase (tipo_id, empieza_en, plazas, plazas_prueba)
        values (fila.tipo_id, inicio, fila.plazas, least(fila.plazas_prueba, fila.plazas))
        on conflict (tipo_id, empieza_en) do nothing;
        get diagnostics nuevas = row_count;
        creadas := creadas + nuevas;
      end if;
    end loop;
  end loop;
  return creadas;
end;
$$;

-- Aplicar una plantilla a una o varias semanas completas (de lunes a domingo).
create or replace function public.aplicar_plantilla(p_plantilla uuid, p_fecha date, p_semanas int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  lunes date := date_trunc('week', p_fecha)::date;
begin
  if p_semanas < 1 or p_semanas > 12 then
    raise exception 'Semanas entre 1 y 12';
  end if;
  if not exists (select 1 from public.plantillas_horario where id = p_plantilla) then
    raise exception 'Plantilla no encontrada';
  end if;
  return public.crear_clases_rango(p_plantilla, lunes, lunes + (p_semanas * 7) - 1);
end;
$$;

-- El botón «Crear clases» de siempre: usa la plantilla principal.
create or replace function public.generar_clases(semanas int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  id_principal uuid;
begin
  if semanas < 1 or semanas > 12 then
    raise exception 'Semanas entre 1 y 12';
  end if;
  select p.id into id_principal from public.plantillas_horario p where p.principal limit 1;
  if id_principal is null then
    raise exception 'No hay una plantilla principal';
  end if;
  return public.crear_clases_rango(id_principal, hoy, hoy + (semanas * 7));
end;
$$;

revoke all on function public.crear_clases_rango(uuid, date, date) from public, anon, authenticated;
revoke all on function public.aplicar_plantilla(uuid, date, int) from public, anon, authenticated;
revoke all on function public.generar_clases(int) from public, anon, authenticated;
grant execute on function public.crear_clases_rango(uuid, date, date) to service_role;
grant execute on function public.aplicar_plantilla(uuid, date, int) to service_role;
grant execute on function public.generar_clases(int) to service_role;

-- 3. SEGURIDAD: solo la administradora las ve; los cambios los hace la app con la clave secreta ----
alter table public.plantillas_horario enable row level security;
alter table public.plantilla_clases enable row level security;
revoke all on public.plantillas_horario from anon, authenticated;
revoke all on public.plantilla_clases from anon, authenticated;
grant select on public.plantillas_horario to authenticated;
grant select on public.plantilla_clases to authenticated;

drop policy if exists plantillas_ver on public.plantillas_horario;
create policy plantillas_ver on public.plantillas_horario
  for select to authenticated using ((select public.es_admin()));

drop policy if exists plantilla_clases_ver on public.plantilla_clases;
create policy plantilla_clases_ver on public.plantilla_clases
  for select to authenticated using ((select public.es_admin()));
