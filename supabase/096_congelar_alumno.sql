-- Congelar alumno/a (por ejemplo por una lesión): mientras está congelado/a no cuenta como alumno/a activo/a.
-- No toca los bonos ni borra nada. Los cambia solo la administradora desde la app.

alter table public.profiles
  add column if not exists congelado boolean not null default false,
  add column if not exists congelado_desde timestamptz,
  add column if not exists congelado_hasta date,
  add column if not exists congelado_motivo text check (congelado_motivo is null or char_length(congelado_motivo) <= 500);
