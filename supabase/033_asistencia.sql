-- Asistencia real: la administradora marca si cada persona vino a su clase reservada.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

alter table public.reservas add column if not exists asistencia text
  check (asistencia is null or asistencia in ('asistio', 'no_asistio'));
alter table public.reservas add column if not exists asistencia_en timestamptz;
