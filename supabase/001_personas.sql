-- Fase 3 · Personas, servicios y consentimientos
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra nada: solo crea tablas, funciones y reglas nuevas.

-- 1. PERFILES (una fila por persona, ligada a su cuenta de acceso) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'invitado'
    check (rol in ('admin', 'alumno', 'invitado')),
  email text,
  nombre text,
  apellidos text,
  telefono text,
  dni text,
  fecha_nacimiento date,
  contacto_emergencia_nombre text,
  contacto_emergencia_telefono text,
  idioma text not null default 'es' check (idioma in ('es', 'en')),
  datos_completos boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Un mismo DNI/NIE no puede estar en dos cuentas (evita repetir la clase de prueba).
create unique index if not exists profiles_dni_unico
  on public.profiles (dni) where dni is not null and dni <> '';

-- 2. SERVICIOS de cada persona (puede tener varios a la vez) ----------------
create table if not exists public.perfil_servicios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  servicio text not null check (servicio in ('grupal', 'individual', 'online')),
  creado_en timestamptz not null default now(),
  unique (user_id, servicio)
);

-- 3. CONSENTIMIENTOS (qué aceptó cada persona y cuándo) ---------------------
create table if not exists public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('privacidad', 'terminos')),
  version text not null,
  aceptado_en timestamptz not null default now()
);

-- 4. FUNCIONES AUTOMÁTICAS --------------------------------------------------

-- ¿La persona que hace la consulta es administradora?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and rol = 'admin'
  );
$$;

-- Al crearse una cuenta, se crea su perfil. SIEMPRE como invitado:
-- el rol nunca se toma de lo que escriba la persona al registrarse.
create or replace function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, idioma)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data ->> 'idioma' = 'en' then 'en' else 'es' end
  );
  return new;
end;
$$;

drop trigger if exists al_crear_cuenta on auth.users;
create trigger al_crear_cuenta
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo();

-- Antes de guardar cambios en un perfil: ordena el DNI, anota la fecha
-- y calcula si los datos obligatorios están completos.
create or replace function public.preparar_perfil()
returns trigger
language plpgsql
as $$
begin
  new.dni := nullif(upper(regexp_replace(coalesce(new.dni, ''), '\s|-', '', 'g')), '');
  new.actualizado_en := now();
  new.datos_completos :=
    coalesce(trim(new.nombre), '') <> ''
    and coalesce(trim(new.apellidos), '') <> ''
    and coalesce(trim(new.telefono), '') <> ''
    and new.dni is not null
    and new.fecha_nacimiento is not null
    and coalesce(trim(new.contacto_emergencia_nombre), '') <> ''
    and coalesce(trim(new.contacto_emergencia_telefono), '') <> '';
  return new;
end;
$$;

drop trigger if exists antes_de_guardar_perfil on public.profiles;
create trigger antes_de_guardar_perfil
  before insert or update on public.profiles
  for each row execute function public.preparar_perfil();

-- 5. SEGURIDAD: cada persona solo ve lo suyo; la administradora ve todo -----
alter table public.profiles enable row level security;
alter table public.perfil_servicios enable row level security;
alter table public.consentimientos enable row level security;

-- Se quita todo permiso por defecto y se concede solo lo necesario.
revoke all on public.profiles from anon, authenticated;
revoke all on public.perfil_servicios from anon, authenticated;
revoke all on public.consentimientos from anon, authenticated;

grant select on public.profiles to authenticated;
-- Cada persona solo puede editar estas columnas (no su rol, ni su correo).
grant update (
  nombre, apellidos, telefono, dni, fecha_nacimiento,
  contacto_emergencia_nombre, contacto_emergencia_telefono, idioma
) on public.profiles to authenticated;

grant select on public.perfil_servicios to authenticated;
grant select, insert on public.consentimientos to authenticated;

drop policy if exists perfiles_ver on public.profiles;
create policy perfiles_ver on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists perfiles_editar_propio on public.profiles;
create policy perfiles_editar_propio on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists servicios_ver on public.perfil_servicios;
create policy servicios_ver on public.perfil_servicios
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists consentimientos_ver on public.consentimientos;
create policy consentimientos_ver on public.consentimientos
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists consentimientos_aceptar on public.consentimientos;
create policy consentimientos_aceptar on public.consentimientos
  for insert to authenticated
  with check (user_id = (select auth.uid()));
