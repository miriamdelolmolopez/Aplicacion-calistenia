-- Fotos que Miriam puede cambiar desde Administración:
-- tipos de clase, rutinas, ejercicios, portada e Inicio.
-- Solo AÑADE columnas, una tabla y una carpeta (bucket) pública de fotos.

alter table public.tipos_clase add column if not exists foto_url text;
alter table public.rutinas add column if not exists foto_url text;
alter table public.ejercicios add column if not exists foto_url text;

create table if not exists public.fotos_app (
  clave text primary key check (clave in ('portada', 'inicio')),
  url text not null
);

alter table public.fotos_app enable row level security;

-- La portada la ve cualquiera (también quien no ha entrado). Solo se escribe desde el servidor.
drop policy if exists "fotos_app se lee" on public.fotos_app;
create policy "fotos_app se lee" on public.fotos_app for select using (true);

-- Carpeta pública de fotos de la app (no son fotos de personas): 1 MB, jpg/png/webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
