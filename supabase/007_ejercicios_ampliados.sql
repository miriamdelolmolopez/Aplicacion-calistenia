-- Fase 5 · Parte B1: tipos de ejercicio, músculos y material
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- Sustituye la columna "medida" por "tipo" (los datos se convierten antes). No pierde ejercicios.

-- 1. TIPO DE EJERCICIO ---------------------------------------------------------
alter table public.ejercicios
  add column if not exists tipo text not null default 'repeticiones'
    check (tipo in (
      'duracion',
      'repeticiones',
      'peso_corporal_lastre',
      'repeticiones_peso',
      'peso_corporal_asistido',
      'distancia_duracion',
      'peso_distancia'
    ));

-- Convierte la antigua "medida" (segundos / repeticiones) y la elimina.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ejercicios' and column_name = 'medida'
  ) then
    execute $q$update public.ejercicios
               set tipo = case medida when 'segundos' then 'duracion' else 'repeticiones' end$q$;
    execute 'alter table public.ejercicios drop column medida';
  end if;
end;
$$;

update public.ejercicios set tipo = 'peso_corporal_asistido' where lower(nombre) = 'dominada con banda';

-- 2. MÚSCULOS de cada ejercicio (principales y secundarios) --------------------
create table if not exists public.ejercicio_musculos (
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  musculo text not null check (musculo in (
    'cuello', 'trapecio', 'hombro_delantero', 'hombro_trasero', 'pecho', 'biceps',
    'triceps', 'antebrazo', 'espalda_alta', 'espalda_baja', 'abdominales', 'oblicuos',
    'gluteos', 'cuadriceps', 'isquiotibiales', 'aductores', 'abductores', 'gemelos'
  )),
  rol text not null check (rol in ('principal', 'secundario')),
  primary key (ejercicio_id, musculo)
);

-- 3. MATERIAL ----------------------------------------------------------------------
create table if not exists public.materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 60),
  nombre_en text check (nombre_en is null or char_length(nombre_en) between 2 and 60),
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create unique index if not exists materiales_nombre_unico on public.materiales (lower(nombre));

create table if not exists public.ejercicio_materiales (
  ejercicio_id uuid not null references public.ejercicios (id) on delete cascade,
  material_id uuid not null references public.materiales (id) on delete cascade,
  primary key (ejercicio_id, material_id)
);

insert into public.materiales (nombre, nombre_en, orden) values
  ('Barra de dominadas', 'Pull-up bar', 1),
  ('Paralelas', 'Parallel bars', 2),
  ('Anillas', 'Rings', 3),
  ('Banda elástica', 'Resistance band', 4),
  ('Lastre (chaleco o cinturón)', 'Weight (vest or belt)', 5),
  ('Paralettes', 'Parallettes', 6),
  ('Banco o cajón', 'Bench or box', 7),
  ('Esterilla', 'Mat', 8),
  ('Pared', 'Wall', 9)
on conflict do nothing;

-- 4. DATOS SUGERIDOS para los 29 ejercicios de partida (revísalos en el panel) ----
insert into public.ejercicio_musculos (ejercicio_id, musculo, rol)
select e.id, m.musculo, m.rol
from (values
  ('Colgada pasiva','antebrazo','principal'),('Colgada pasiva','espalda_alta','secundario'),('Colgada pasiva','trapecio','secundario'),
  ('Colgada activa','espalda_alta','principal'),('Colgada activa','trapecio','secundario'),('Colgada activa','antebrazo','secundario'),('Colgada activa','biceps','secundario'),
  ('Escapulares','espalda_alta','principal'),('Escapulares','trapecio','principal'),('Escapulares','antebrazo','secundario'),
  ('Remo australiano','espalda_alta','principal'),('Remo australiano','biceps','secundario'),('Remo australiano','trapecio','secundario'),('Remo australiano','hombro_trasero','secundario'),('Remo australiano','antebrazo','secundario'),
  ('Dominada con salto','espalda_alta','principal'),('Dominada con salto','biceps','principal'),('Dominada con salto','antebrazo','secundario'),('Dominada con salto','trapecio','secundario'),('Dominada con salto','abdominales','secundario'),
  ('Negativa de dominada','espalda_alta','principal'),('Negativa de dominada','biceps','principal'),('Negativa de dominada','antebrazo','secundario'),('Negativa de dominada','trapecio','secundario'),('Negativa de dominada','abdominales','secundario'),
  ('Isométrico de dominada arriba','espalda_alta','principal'),('Isométrico de dominada arriba','biceps','principal'),('Isométrico de dominada arriba','antebrazo','secundario'),('Isométrico de dominada arriba','trapecio','secundario'),
  ('Isométrico de dominada a 90°','espalda_alta','principal'),('Isométrico de dominada a 90°','biceps','principal'),('Isométrico de dominada a 90°','antebrazo','secundario'),('Isométrico de dominada a 90°','trapecio','secundario'),
  ('Dominada con banda','espalda_alta','principal'),('Dominada con banda','biceps','principal'),('Dominada con banda','antebrazo','secundario'),('Dominada con banda','trapecio','secundario'),('Dominada con banda','abdominales','secundario'),
  ('Dominada','espalda_alta','principal'),('Dominada','biceps','principal'),('Dominada','antebrazo','secundario'),('Dominada','trapecio','secundario'),('Dominada','hombro_trasero','secundario'),('Dominada','abdominales','secundario'),
  ('Hollow body hold','abdominales','principal'),('Hollow body hold','oblicuos','secundario'),
  ('Pike hold','hombro_delantero','principal'),('Pike hold','triceps','secundario'),('Pike hold','trapecio','secundario'),('Pike hold','abdominales','secundario'),
  ('Wall walk','hombro_delantero','principal'),('Wall walk','abdominales','principal'),('Wall walk','triceps','secundario'),('Wall walk','trapecio','secundario'),('Wall walk','pecho','secundario'),('Wall walk','antebrazo','secundario'),
  ('Pino de cara a la pared','hombro_delantero','principal'),('Pino de cara a la pared','triceps','secundario'),('Pino de cara a la pared','trapecio','secundario'),('Pino de cara a la pared','abdominales','secundario'),('Pino de cara a la pared','antebrazo','secundario'),
  ('Despegues de pino','hombro_delantero','principal'),('Despegues de pino','triceps','secundario'),('Despegues de pino','trapecio','secundario'),('Despegues de pino','abdominales','secundario'),('Despegues de pino','antebrazo','secundario'),
  ('Pino libre','hombro_delantero','principal'),('Pino libre','triceps','secundario'),('Pino libre','trapecio','secundario'),('Pino libre','abdominales','secundario'),('Pino libre','antebrazo','secundario'),
  ('Pino a una mano','hombro_delantero','principal'),('Pino a una mano','triceps','secundario'),('Pino a una mano','trapecio','secundario'),('Pino a una mano','abdominales','secundario'),('Pino a una mano','oblicuos','secundario'),('Pino a una mano','antebrazo','secundario'),
  ('Muscle up','espalda_alta','principal'),('Muscle up','triceps','principal'),('Muscle up','biceps','secundario'),('Muscle up','pecho','secundario'),('Muscle up','hombro_delantero','secundario'),('Muscle up','abdominales','secundario'),('Muscle up','antebrazo','secundario'),
  ('Front lever','espalda_alta','principal'),('Front lever','abdominales','principal'),('Front lever','biceps','secundario'),('Front lever','trapecio','secundario'),('Front lever','hombro_trasero','secundario'),('Front lever','antebrazo','secundario'),('Front lever','gluteos','secundario'),
  ('Back lever','hombro_delantero','principal'),('Back lever','pecho','principal'),('Back lever','biceps','secundario'),('Back lever','abdominales','secundario'),('Back lever','espalda_baja','secundario'),('Back lever','antebrazo','secundario'),
  ('Planche tuck','hombro_delantero','principal'),('Planche tuck','pecho','principal'),('Planche tuck','triceps','secundario'),('Planche tuck','abdominales','secundario'),('Planche tuck','antebrazo','secundario'),('Planche tuck','trapecio','secundario'),
  ('Lean planche','hombro_delantero','principal'),('Lean planche','pecho','principal'),('Lean planche','triceps','secundario'),('Lean planche','abdominales','secundario'),('Lean planche','antebrazo','secundario'),('Lean planche','trapecio','secundario'),
  ('Bandera humana','oblicuos','principal'),('Bandera humana','espalda_alta','principal'),('Bandera humana','hombro_delantero','secundario'),('Bandera humana','trapecio','secundario'),('Bandera humana','antebrazo','secundario'),('Bandera humana','gluteos','secundario'),
  ('L-sit','abdominales','principal'),('L-sit','triceps','secundario'),('L-sit','cuadriceps','secundario'),('L-sit','hombro_delantero','secundario'),('L-sit','trapecio','secundario'),
  ('Fondos','triceps','principal'),('Fondos','pecho','principal'),('Fondos','hombro_delantero','secundario'),('Fondos','trapecio','secundario'),('Fondos','abdominales','secundario'),
  ('Flexiones','pecho','principal'),('Flexiones','triceps','secundario'),('Flexiones','hombro_delantero','secundario'),('Flexiones','abdominales','secundario'),
  ('Pistol squat','cuadriceps','principal'),('Pistol squat','gluteos','principal'),('Pistol squat','isquiotibiales','secundario'),('Pistol squat','gemelos','secundario'),('Pistol squat','abdominales','secundario'),('Pistol squat','aductores','secundario'),
  ('Movilidad de muñeca','antebrazo','principal'),
  ('Movilidad de hombro','hombro_delantero','principal'),('Movilidad de hombro','hombro_trasero','principal')
) as m (nombre, musculo, rol)
join public.ejercicios e on lower(e.nombre) = lower(m.nombre)
on conflict do nothing;

insert into public.ejercicio_materiales (ejercicio_id, material_id)
select e.id, ma.id
from (values
  ('Colgada pasiva','Barra de dominadas'),('Colgada activa','Barra de dominadas'),('Escapulares','Barra de dominadas'),
  ('Remo australiano','Barra de dominadas'),('Dominada con salto','Barra de dominadas'),('Negativa de dominada','Barra de dominadas'),
  ('Isométrico de dominada arriba','Barra de dominadas'),('Isométrico de dominada a 90°','Barra de dominadas'),
  ('Dominada con banda','Barra de dominadas'),('Dominada con banda','Banda elástica'),('Dominada','Barra de dominadas'),
  ('Hollow body hold','Esterilla'),('Pike hold','Esterilla'),('Wall walk','Pared'),
  ('Pino de cara a la pared','Pared'),('Despegues de pino','Pared'),
  ('Muscle up','Barra de dominadas'),('Front lever','Barra de dominadas'),('Back lever','Barra de dominadas'),
  ('Planche tuck','Paralettes'),('Lean planche','Paralettes'),('Bandera humana','Barra de dominadas'),
  ('L-sit','Paralettes'),('Fondos','Paralelas'),('Flexiones','Esterilla')
) as v (ejercicio, material)
join public.ejercicios e on lower(e.nombre) = lower(v.ejercicio)
join public.materiales ma on lower(ma.nombre) = lower(v.material)
on conflict do nothing;

-- 5. GUARDAR músculos y material de un ejercicio de una sola vez ------------------------
-- p_musculos: [{"musculo":"pecho","rol":"principal"}, ...]  p_materiales: lista de ids.
create or replace function public.guardar_relaciones_ejercicio(
  p_ejercicio uuid, p_musculos jsonb, p_materiales uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.ejercicios where id = p_ejercicio) then
    raise exception 'Ejercicio no encontrado';
  end if;

  delete from public.ejercicio_musculos where ejercicio_id = p_ejercicio;
  insert into public.ejercicio_musculos (ejercicio_id, musculo, rol)
  select p_ejercicio, x ->> 'musculo', x ->> 'rol'
  from jsonb_array_elements(coalesce(p_musculos, '[]'::jsonb)) as x;

  delete from public.ejercicio_materiales where ejercicio_id = p_ejercicio;
  insert into public.ejercicio_materiales (ejercicio_id, material_id)
  select p_ejercicio, m from unnest(coalesce(p_materiales, '{}'::uuid[])) as m
  on conflict do nothing;

  update public.ejercicios set actualizado_en = now() where id = p_ejercicio;
end;
$$;

revoke all on function public.guardar_relaciones_ejercicio(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.guardar_relaciones_ejercicio(uuid, jsonb, uuid[]) to service_role;

-- 6. SEGURIDAD: por ahora solo la administradora ve estas tablas; nadie escribe desde el navegador.
alter table public.ejercicio_musculos enable row level security;
alter table public.materiales enable row level security;
alter table public.ejercicio_materiales enable row level security;

revoke all on public.ejercicio_musculos from anon, authenticated;
revoke all on public.materiales from anon, authenticated;
revoke all on public.ejercicio_materiales from anon, authenticated;
grant select on public.ejercicio_musculos to authenticated;
grant select on public.materiales to authenticated;
grant select on public.ejercicio_materiales to authenticated;

drop policy if exists ejercicio_musculos_admin_ver on public.ejercicio_musculos;
create policy ejercicio_musculos_admin_ver on public.ejercicio_musculos
  for select to authenticated using ((select public.es_admin()));

drop policy if exists materiales_admin_ver on public.materiales;
create policy materiales_admin_ver on public.materiales
  for select to authenticated using ((select public.es_admin()));

drop policy if exists ejercicio_materiales_admin_ver on public.ejercicio_materiales;
create policy ejercicio_materiales_admin_ver on public.ejercicio_materiales
  for select to authenticated using ((select public.es_admin()));
