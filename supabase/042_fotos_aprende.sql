-- Fotos opcionales en el glosario y en la historia de Aprende.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

alter table public.glosario add column if not exists foto_url text;
alter table public.historia add column if not exists foto_url text;
