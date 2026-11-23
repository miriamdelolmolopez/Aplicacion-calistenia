-- Leads (nueva versión, copiada del diseño de Kalia Coach): estados, tipos y etiquetas editables, notas y formularios conectados.
-- Pégalo ENTERO en el editor SQL de Supabase (proyecto de la app de calistenia) y pulsa Run.
-- Se puede ejecutar más de una vez sin problema. No borra nada y no toca ningún dato que ya exista.
-- IMPORTANTE: NO ejecutes el archivo antiguo 097_leads.sql (era un borrador). Este lo sustituye.
-- Necesita que ya exista la función public.es_admin() (la usan las demás tablas de la app).

-- 1. Estados del embudo (editables: añadir, renombrar, ordenar, quitar) ------------------------------------------------
create table if not exists public.leads_estados (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  orden int not null default 0,
  es_ganado boolean not null default false,
  color text not null default 'gris' check (color in ('gris', 'azul', 'verde', 'ambar', 'rojo', 'lila', 'rosa', 'turquesa') or color ~ '^#[0-9a-fA-F]{6}$'),
  creado_en timestamptz not null default now(),
  unique (entrenador_id, nombre)
);

-- 2. Listas de tipos y etiquetas ---------------------------------------------------------------------------------------
create table if not exists public.leads_etiquetas (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 30),
  color text not null default 'gris' check (color in ('gris', 'azul', 'verde', 'ambar', 'rojo', 'lila', 'rosa', 'turquesa') or color ~ '^#[0-9a-fA-F]{6}$'),
  orden int not null default 0,
  unique (entrenador_id, nombre)
);

create table if not exists public.leads_tipos (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 30),
  color text not null default 'gris' check (color in ('gris', 'azul', 'verde', 'ambar', 'rojo', 'lila', 'rosa', 'turquesa') or color ~ '^#[0-9a-fA-F]{6}$'),
  orden int not null default 0,
  unique (entrenador_id, nombre)
);

-- Para crear las listas de ejemplo solo la primera vez.
alter table public.profiles add column if not exists leads_catalogos_iniciados boolean not null default false;

-- 3. Formularios externos conectados (cada uno con una dirección secreta) --------------------------------------------------
create table if not exists public.leads_conexiones (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  token_hash text not null unique,
  ultimos4 text not null default '',
  activo boolean not null default true,
  recibidos int not null default 0,
  ultimo_uso timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists leads_conexiones_entrenador_idx on public.leads_conexiones (entrenador_id);

-- 4. Leads --------------------------------------------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  estado_id uuid not null references public.leads_estados (id) on delete restrict,
  nombre text not null check (char_length(nombre) between 1 and 80),
  apellidos text not null default '' check (char_length(apellidos) <= 120),
  telefono text not null default '' check (char_length(telefono) <= 30),
  email text not null default '' check (char_length(email) <= 200),
  pais text not null default '' check (char_length(pais) <= 60),
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  tipo_id uuid references public.leads_tipos (id) on delete set null,
  etiqueta_ids uuid[] not null default '{}',
  destino text not null default 'Manual' check (char_length(destino) <= 120),
  manual boolean not null default true,
  notas text not null default '' check (char_length(notas) <= 4000),
  info jsonb not null default '[]'::jsonb,
  cliente_id uuid references public.profiles (id) on delete set null,
  conexion_id uuid references public.leads_conexiones (id) on delete set null,
  llegada_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists leads_entrenador_llegada_idx on public.leads (entrenador_id, llegada_en desc);
create index if not exists leads_conexion_idx on public.leads (conexion_id, llegada_en desc);

-- 5. Notas internas de venta --------------------------------------------------------------------------------------------
create table if not exists public.leads_notas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  entrenador_id uuid not null references public.profiles (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  estado_nombre text not null default '',
  autor text not null default '',
  creado_en timestamptz not null default now()
);
create index if not exists leads_notas_lead_idx on public.leads_notas (lead_id, creado_en desc);

-- 6. Seguridad: las escrituras las hace el servidor; solo la administradora lee lo suyo -----------------------------------
alter table public.leads_estados enable row level security;
alter table public.leads_etiquetas enable row level security;
alter table public.leads_tipos enable row level security;
alter table public.leads_conexiones enable row level security;
alter table public.leads enable row level security;
alter table public.leads_notas enable row level security;

revoke all on public.leads_estados, public.leads_etiquetas, public.leads_tipos, public.leads_conexiones, public.leads, public.leads_notas from anon, authenticated;
grant select on public.leads_estados, public.leads_etiquetas, public.leads_tipos, public.leads, public.leads_notas to authenticated;
-- De las conexiones nunca se lee la huella de la clave secreta.
grant select (id, entrenador_id, nombre, ultimos4, activo, recibidos, ultimo_uso, creado_en) on public.leads_conexiones to authenticated;

drop policy if exists leads_estados_ver on public.leads_estados;
create policy leads_estados_ver on public.leads_estados for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));
drop policy if exists leads_etiquetas_ver on public.leads_etiquetas;
create policy leads_etiquetas_ver on public.leads_etiquetas for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));
drop policy if exists leads_tipos_ver on public.leads_tipos;
create policy leads_tipos_ver on public.leads_tipos for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));
drop policy if exists leads_conexiones_ver on public.leads_conexiones;
create policy leads_conexiones_ver on public.leads_conexiones for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));
drop policy if exists leads_ver on public.leads;
create policy leads_ver on public.leads for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));
drop policy if exists leads_notas_ver on public.leads_notas;
create policy leads_notas_ver on public.leads_notas for select to authenticated using ((select public.es_admin()) and entrenador_id = (select auth.uid()));

notify pgrst, 'reload schema';
