-- Datos propios de un taller: si es presencial u online, dónde es y el enlace (si es online).
-- Se guardan en cada clase, porque un mismo taller puede repetirse en sitios distintos.

alter table public.sesiones_clase
  add column if not exists modalidad text not null default 'presencial' check (modalidad in ('presencial', 'online')),
  add column if not exists ubicacion text,
  add column if not exists enlace text;
