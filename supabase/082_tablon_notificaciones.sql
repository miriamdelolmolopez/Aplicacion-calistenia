-- Tablón de anuncios, notificaciones dentro de la app y suscripciones a las notificaciones del móvil.
-- No cambia ningún dato existente: crea tablas nuevas y una columna nueva. Todo se lee y escribe desde el servidor
-- (clave de servicio), nada queda abierto a las personas.

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  texto text not null,
  enlace text,
  audiencia text not null default 'activos' check (audiencia in ('activos', 'todos')),
  fijado boolean not null default false,
  publicado_en timestamptz not null default now(),
  caduca_en timestamptz,
  avisar_app boolean not null default true,
  avisar_correo boolean not null default false,
  creado_por uuid references public.profiles(id) on delete set null
);

create index if not exists anuncios_publicado_idx on public.anuncios (publicado_en desc);

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text,
  enlace text,
  ref text,
  leida boolean not null default false,
  creada_en timestamptz not null default now()
);

create index if not exists notificaciones_user_idx on public.notificaciones (user_id, creada_en desc);
create unique index if not exists notificaciones_ref_unica on public.notificaciones (user_id, tipo, ref) where ref is not null;

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creada_en timestamptz not null default now()
);

create index if not exists push_user_idx on public.push_suscripciones (user_id);

alter table public.profiles add column if not exists avisos_app jsonb not null default '{}'::jsonb;

alter table public.anuncios enable row level security;
alter table public.notificaciones enable row level security;
alter table public.push_suscripciones enable row level security;
revoke all on public.anuncios from anon, authenticated;
revoke all on public.notificaciones from anon, authenticated;
revoke all on public.push_suscripciones from anon, authenticated;
