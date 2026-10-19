-- Academia: cursos y formaciones.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: crea la tabla de cursos (vacía) con su seguridad.
--
-- estado: 'activo' (se ve en «Cursos actuales»), 'proximo' (se ve en «Próximos cursos»)
--         u 'oculto' (solo lo ve la administradora).
-- popularidad y valoracion las pone la administradora a mano por ahora.

create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  titulo_en text,
  descripcion text,
  descripcion_en text,
  categoria text,
  nivel text not null default 'iniciacion' check (nivel in ('iniciacion', 'intermedio', 'avanzado')),
  precio_centimos int not null default 0 check (precio_centimos >= 0),
  estado text not null default 'oculto' check (estado in ('activo', 'proximo', 'oculto')),
  enlace text,
  foto_url text,
  popularidad int not null default 0 check (popularidad >= 0),
  valoracion numeric(2, 1) check (valoracion is null or valoracion between 0 and 5),
  fecha_prevista date,
  creado_en timestamptz not null default now()
);

alter table public.cursos enable row level security;

drop policy if exists "cursos se leen" on public.cursos;
create policy "cursos se leen" on public.cursos for select to authenticated
  using (estado <> 'oculto' or public.es_admin());
