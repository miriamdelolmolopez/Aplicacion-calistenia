-- Bloque 2 · Perfil, Ajustes y Mis pagos
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. PREFERENCIAS Y FOTO DE CADA PERSONA ------------------------------------------
alter table public.profiles
  add column if not exists foto_path text,
  add column if not exists mostrar_foto boolean not null default true,
  add column if not exists avisar_cumple boolean not null default true,
  add column if not exists avisos_reserva boolean not null default true,
  add column if not exists avisos_bono boolean not null default true;

-- Cada persona puede cambiar sus preferencias (la ruta de la foto solo la toca la app).
grant update (mostrar_foto, avisar_cumple, avisos_reserva, avisos_bono) on public.profiles to authenticated;

-- 2. MEDIDAS CORPORALES (solo las ve la persona y Miriam) ---------------------------
create table if not exists public.medidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fecha date not null default current_date check (fecha <= current_date + 1),
  peso_kg numeric(5, 2) check (peso_kg between 20 and 400),
  altura_cm numeric(5, 1) check (altura_cm between 80 and 250),
  cintura_cm numeric(5, 1) check (cintura_cm between 30 and 250),
  cadera_cm numeric(5, 1) check (cadera_cm between 30 and 250),
  pecho_cm numeric(5, 1) check (pecho_cm between 30 and 250),
  brazo_cm numeric(5, 1) check (brazo_cm between 10 and 100),
  muslo_cm numeric(5, 1) check (muslo_cm between 20 and 150),
  creado_en timestamptz not null default now(),
  unique (user_id, fecha),
  check (num_nonnulls(peso_kg, altura_cm, cintura_cm, cadera_cm, pecho_cm, brazo_cm, muslo_cm) > 0)
);
create index if not exists medidas_user_fecha on public.medidas (user_id, fecha desc);

alter table public.medidas enable row level security;
revoke all on public.medidas from anon, authenticated;
grant select, insert, update, delete on public.medidas to authenticated;

drop policy if exists medidas_ver on public.medidas;
create policy medidas_ver on public.medidas
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists medidas_crear on public.medidas;
create policy medidas_crear on public.medidas
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists medidas_editar on public.medidas;
create policy medidas_editar on public.medidas
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists medidas_borrar on public.medidas;
create policy medidas_borrar on public.medidas
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 3. PETICIONES DE BORRADO DE CUENTA (las atiende Miriam) ---------------------------
create table if not exists public.solicitudes_borrado (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creada_en timestamptz not null default now(),
  atendida boolean not null default false
);
create unique index if not exists solicitudes_borrado_una_pendiente
  on public.solicitudes_borrado (user_id) where not atendida;

alter table public.solicitudes_borrado enable row level security;
revoke all on public.solicitudes_borrado from anon, authenticated;
grant select on public.solicitudes_borrado to authenticated;

drop policy if exists solicitudes_borrado_ver on public.solicitudes_borrado;
create policy solicitudes_borrado_ver on public.solicitudes_borrado
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));
