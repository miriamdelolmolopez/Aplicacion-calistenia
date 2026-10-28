-- Permite cambiar la foto de cualquier tarjeta de la app (claves «card:…» en fotos_app).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra ni cambia ningún dato: solo ensancha la regla de qué nombres se aceptan.

alter table public.fotos_app drop constraint if exists fotos_app_clave_check;
alter table public.fotos_app add constraint fotos_app_clave_check
  check (clave in ('portada', 'inicio') or clave like 'card:%');
