-- Consentimiento de imagen: casilla aparte, opcional y que se puede retirar.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

-- Cada vez que alguien marca o desmarca la casilla se guarda una fila nueva;
-- la más reciente es la que vale (así queda el historial con fechas).
alter table public.consentimientos add column if not exists concedido boolean not null default true;

alter table public.consentimientos drop constraint if exists consentimientos_tipo_check;
alter table public.consentimientos
  add constraint consentimientos_tipo_check check (tipo in ('privacidad', 'terminos', 'imagen'));
