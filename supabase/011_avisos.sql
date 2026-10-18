-- Fase 6 · Avisos por email: preferencia de cada persona y registro de avisos enviados
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. Preferencia: avisos no esenciales (confirmación de reserva, bono a punto de caducar).
alter table public.profiles
  add column if not exists avisos_email boolean not null default true;

-- 2. Registro de avisos automáticos ya enviados, para no repetirlos.
-- tipo: 'bono_caduca' | 'minimo_clase'. ref_id: el bono o la clase.
create table if not exists public.avisos_enviados (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('bono_caduca', 'minimo_clase')),
  ref_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enviado_en timestamptz not null default now(),
  unique (tipo, ref_id, user_id)
);

-- Solo la parte privada de la app (clave secreta) lo usa.
alter table public.avisos_enviados enable row level security;
revoke all on public.avisos_enviados from anon, authenticated;
