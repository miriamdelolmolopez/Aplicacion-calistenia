-- Fase 4 · Parte A: tipos de clase, horario semanal y clases concretas
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. TIPOS DE CLASE ---------------------------------------------------------
create table if not exists public.tipos_clase (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  plazas_max int not null check (plazas_max > 0),
  minimo_alumnos int not null default 0 check (minimo_alumnos >= 0),
  duracion_min int not null default 60 check (duracion_min > 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- 2. HORARIO SEMANAL (la plantilla con la que se generan las clases) --------
create table if not exists public.horario_semanal (
  id uuid primary key default gen_random_uuid(),
  tipo_id uuid not null references public.tipos_clase (id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 7), -- 1 = lunes ... 7 = domingo
  hora time not null,
  activo boolean not null default true,
  unique (tipo_id, dia_semana, hora)
);

-- 3. CLASES CONCRETAS (cada una con su fecha y hora) ------------------------
create table if not exists public.sesiones_clase (
  id uuid primary key default gen_random_uuid(),
  tipo_id uuid not null references public.tipos_clase (id) on delete restrict,
  empieza_en timestamptz not null,
  plazas int not null check (plazas > 0),
  estado text not null default 'programada'
    check (estado in ('programada', 'cancelada')),
  motivo_cancelacion text,
  creado_en timestamptz not null default now(),
  unique (tipo_id, empieza_en)
);

create index if not exists sesiones_clase_empieza_en
  on public.sesiones_clase (empieza_en);

-- 4. DATOS INICIALES --------------------------------------------------------
insert into public.tipos_clase (nombre, plazas_max)
values ('Pino intermedio', 6), ('Pino principiantes', 6), ('Calistenia', 10)
on conflict (nombre) do nothing;

insert into public.horario_semanal (tipo_id, dia_semana, hora)
select t.id, d.dia, h.hora
from public.tipos_clase t
join (values
  ('Pino intermedio', '17:30'::time),
  ('Pino principiantes', '18:35'::time),
  ('Calistenia', '19:40'::time)
) as h (nombre, hora) on h.nombre = t.nombre
cross join (values (1), (3)) as d (dia)  -- lunes y miércoles
on conflict (tipo_id, dia_semana, hora) do nothing;

-- 5. GENERAR CLASES de las próximas semanas a partir del horario semanal ----
-- Las horas se interpretan en hora de Madrid (cuenta el cambio de hora).
-- Solo la usa la parte privada de la app (clave secreta).
create or replace function public.generar_clases(semanas int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas int := 0;
  nuevas int;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  dia date;
  fila record;
  inicio timestamptz;
begin
  if semanas < 1 or semanas > 12 then
    raise exception 'Semanas entre 1 y 12';
  end if;

  for dia in
    select generate_series(hoy, hoy + (semanas * 7), interval '1 day')::date
  loop
    for fila in
      select h.hora, t.id as tipo_id, t.plazas_max
      from public.horario_semanal h
      join public.tipos_clase t on t.id = h.tipo_id
      where h.activo and t.activo
        and h.dia_semana = extract(isodow from dia)
    loop
      inicio := (dia + fila.hora) at time zone 'Europe/Madrid';
      if inicio > now() then
        insert into public.sesiones_clase (tipo_id, empieza_en, plazas)
        values (fila.tipo_id, inicio, fila.plazas_max)
        on conflict (tipo_id, empieza_en) do nothing;
        get diagnostics nuevas = row_count;
        creadas := creadas + nuevas;
      end if;
    end loop;
  end loop;

  return creadas;
end;
$$;

revoke all on function public.generar_clases(int) from public, anon, authenticated;
grant execute on function public.generar_clases(int) to service_role;

-- 6. SEGURIDAD --------------------------------------------------------------
-- Cualquier persona con cuenta (incluidos invitados) puede VER las clases.
-- Solo la parte privada de la app (administradora) puede crearlas o cambiarlas.
alter table public.tipos_clase enable row level security;
alter table public.horario_semanal enable row level security;
alter table public.sesiones_clase enable row level security;

revoke all on public.tipos_clase from anon, authenticated;
revoke all on public.horario_semanal from anon, authenticated;
revoke all on public.sesiones_clase from anon, authenticated;

grant select on public.tipos_clase to authenticated;
grant select on public.sesiones_clase to authenticated;

drop policy if exists tipos_clase_ver on public.tipos_clase;
create policy tipos_clase_ver on public.tipos_clase
  for select to authenticated using (true);

drop policy if exists sesiones_clase_ver on public.sesiones_clase;
create policy sesiones_clase_ver on public.sesiones_clase
  for select to authenticated using (true);
