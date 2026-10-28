-- Carpetas y subcarpetas para ordenar las rutinas de los alumnos (como en un Drive).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie. Las rutinas que ya hay se quedan donde están (sin carpeta).

-- 1) Las carpetas. Una carpeta puede estar dentro de otra (padre_id).
--    Si se borra una carpeta, se borran sus subcarpetas, pero las rutinas NO se borran: vuelven al inicio.
create table if not exists public.carpetas_rutinas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 60),
  padre_id uuid references public.carpetas_rutinas (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create index if not exists carpetas_rutinas_padre on public.carpetas_rutinas (padre_id);

alter table public.carpetas_rutinas enable row level security;
revoke all on public.carpetas_rutinas from anon, authenticated;

-- 2) Cada rutina puede estar en una carpeta (vacío = en el inicio).
alter table public.rutinas add column if not exists carpeta_id uuid
  references public.carpetas_rutinas (id) on delete set null;

create index if not exists rutinas_carpeta on public.rutinas (carpeta_id);
