-- Fase 5 · Parte A: biblioteca de ejercicios
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

create table if not exists public.ejercicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  nombre_en text check (nombre_en is null or char_length(nombre_en) between 2 and 80),
  categoria text not null default 'otros'
    check (categoria in ('pino', 'empuje', 'tiron', 'core', 'piernas', 'skills', 'movilidad', 'otros')),
  medida text not null default 'repeticiones' check (medida in ('repeticiones', 'segundos')),
  descripcion text check (descripcion is null or char_length(descripcion) <= 2000),
  descripcion_en text check (descripcion_en is null or char_length(descripcion_en) <= 2000),
  video_url text check (video_url is null or char_length(video_url) <= 300),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- No puede haber dos ejercicios con el mismo nombre.
create unique index if not exists ejercicios_nombre_unico on public.ejercicios (lower(nombre));
create index if not exists ejercicios_categoria on public.ejercicios (categoria);

-- Ejercicios de partida, sacados de tu lista de biblioteca (sin explicación ni vídeo:
-- los completas tú). Si ya existen, no se tocan.
insert into public.ejercicios (nombre, categoria, medida) values
  ('Colgada pasiva', 'tiron', 'segundos'),
  ('Colgada activa', 'tiron', 'segundos'),
  ('Escapulares', 'tiron', 'repeticiones'),
  ('Remo australiano', 'tiron', 'repeticiones'),
  ('Dominada con salto', 'tiron', 'repeticiones'),
  ('Negativa de dominada', 'tiron', 'repeticiones'),
  ('Isométrico de dominada arriba', 'tiron', 'segundos'),
  ('Isométrico de dominada a 90°', 'tiron', 'segundos'),
  ('Dominada con banda', 'tiron', 'repeticiones'),
  ('Dominada', 'tiron', 'repeticiones'),
  ('Hollow body hold', 'core', 'segundos'),
  ('Pike hold', 'pino', 'segundos'),
  ('Wall walk', 'pino', 'repeticiones'),
  ('Pino de cara a la pared', 'pino', 'segundos'),
  ('Despegues de pino', 'pino', 'repeticiones'),
  ('Pino libre', 'pino', 'segundos'),
  ('Pino a una mano', 'pino', 'segundos'),
  ('Muscle up', 'skills', 'repeticiones'),
  ('Front lever', 'skills', 'segundos'),
  ('Back lever', 'skills', 'segundos'),
  ('Planche tuck', 'skills', 'segundos'),
  ('Lean planche', 'skills', 'segundos'),
  ('Bandera humana', 'skills', 'segundos'),
  ('L-sit', 'core', 'segundos'),
  ('Fondos', 'empuje', 'repeticiones'),
  ('Flexiones', 'empuje', 'repeticiones'),
  ('Pistol squat', 'piernas', 'repeticiones'),
  ('Movilidad de muñeca', 'movilidad', 'segundos'),
  ('Movilidad de hombro', 'movilidad', 'segundos')
on conflict do nothing;

-- Seguridad: por ahora solo la administradora puede ver la biblioteca (más adelante,
-- cada alumno verá los ejercicios de su rutina publicada). Nadie escribe desde el navegador.
alter table public.ejercicios enable row level security;
revoke all on public.ejercicios from anon, authenticated;
grant select on public.ejercicios to authenticated;

drop policy if exists ejercicios_admin_ver on public.ejercicios;
create policy ejercicios_admin_ver on public.ejercicios
  for select to authenticated
  using ((select public.es_admin()));
