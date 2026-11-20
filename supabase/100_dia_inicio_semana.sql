-- Día en que empieza la semana de entreno de cada persona (entrenamiento online).
-- 0 = lunes (como hasta ahora) … 6 = domingo. Cada persona puede cambiar el suyo. No borra nada.

alter table public.profiles
  add column if not exists dia_inicio_semana smallint not null default 0;

alter table public.profiles
  drop constraint if exists profiles_dia_inicio_semana_valido;
alter table public.profiles
  add constraint profiles_dia_inicio_semana_valido check (dia_inicio_semana between 0 and 6);

grant update (dia_inicio_semana) on public.profiles to authenticated;
