-- Textos legales editables desde la administración, con versiones.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

create table if not exists public.textos_legales (
  id uuid primary key default gen_random_uuid(),
  documento text not null check (documento in ('terminos', 'privacidad', 'aviso-legal', 'cookies')),
  version text not null,
  contenido text not null,
  vigente boolean not null default false,
  publicado_en timestamptz not null default now(),
  unique (documento, version)
);

-- Solo una versión vigente por documento.
create unique index if not exists textos_legales_un_vigente on public.textos_legales (documento) where vigente;

-- Cualquiera puede leer los textos (son públicos); solo la aplicación los cambia.
alter table public.textos_legales enable row level security;
revoke all on public.textos_legales from anon, authenticated;
grant select on public.textos_legales to anon, authenticated;

drop policy if exists textos_legales_ver on public.textos_legales;
create policy textos_legales_ver on public.textos_legales
  for select to anon, authenticated using (true);
