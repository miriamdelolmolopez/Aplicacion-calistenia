-- Invitaciones enviadas: las personas invitadas por correo que todavía no han creado su cuenta.
-- Solo la administradora (con la clave de servicio) lee y escribe; nadie más.
-- No cambia ningún dato existente: solo crea una tabla nueva.

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  idioma text not null default 'es',
  enviado boolean not null default false,
  creada_en timestamptz not null default now(),
  creada_por uuid references public.profiles(id) on delete set null
);

create index if not exists invitaciones_correo_idx on public.invitaciones (lower(correo));

alter table public.invitaciones enable row level security;
revoke all on public.invitaciones from anon, authenticated;
