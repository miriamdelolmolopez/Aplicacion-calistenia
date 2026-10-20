-- Formas de pago editables: nombre, orden, activar/desactivar y formas nuevas.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

create table if not exists public.formas_pago (
  clave text primary key check (clave ~ '^[a-z0-9_]{2,30}$'),
  nombre text not null,
  activa boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

alter table public.formas_pago enable row level security;
revoke all on public.formas_pago from anon, authenticated;

insert into public.formas_pago (clave, nombre, activa, orden) values
  ('efectivo', 'Efectivo', true, 1),
  ('bizum', 'Bizum', true, 2),
  ('transferencia', 'Transferencia', true, 3),
  ('tarjeta', 'Tarjeta', false, 4)
on conflict (clave) do nothing;

-- Los pagos pueden usar cualquier forma de pago de la lista (ya no solo las cuatro de siempre).
alter table public.pagos drop constraint if exists pagos_metodo_check;
