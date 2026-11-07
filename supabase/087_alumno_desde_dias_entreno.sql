-- Dos datos nuevos de cada persona:
--  · alumno_desde: desde cuándo es alumno/a (para el aniversario y para tener una base de datos ordenada).
--  · dias_entreno: los días de la semana en que quiere entrenar online (1 = lunes ... 7 = domingo). Opcional; con ellos la app
--    le avisa por la mañana de que ese día toca entrenar.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run. No borra datos.

alter table public.profiles add column if not exists alumno_desde date;
alter table public.profiles add column if not exists dias_entreno smallint[] not null default '{}';

-- Los días van de 1 a 7.
alter table public.profiles drop constraint if exists profiles_dias_entreno_rango;
alter table public.profiles
  add constraint profiles_dias_entreno_rango check (dias_entreno <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
