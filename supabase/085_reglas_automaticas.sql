-- 085: automatizaciones propias (cuando ocurra… entonces que haga…).
-- No borra ni cambia nada existente: crea tablas nuevas y añade dos interruptores (correo / aviso en la app)
-- a las automatizaciones que ya tienes, para poder elegir cómo avisa cada una.

-- 1) Las automatizaciones que crea Miriam: condiciones (todas deben cumplirse) y consecuencias (en orden).
create table if not exists public.reglas_automaticas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  activa boolean not null default false,
  condiciones jsonb not null default '[]'::jsonb,
  acciones jsonb not null default '[]'::jsonb,
  -- Vacío: una sola vez por persona. Con un número: vuelve a actuar pasados esos días si sigue cumpliéndose.
  repeticion_dias int check (repeticion_dias is null or repeticion_dias between 1 and 365),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- 2) A quién se ha aplicado cada una y cuándo (para no repetir y para ver el historial).
create table if not exists public.reglas_ejecuciones (
  id uuid primary key default gen_random_uuid(),
  regla_id uuid not null references public.reglas_automaticas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ejecutada_en timestamptz not null default now(),
  resumen text
);
create index if not exists reglas_ejecuciones_regla_persona on public.reglas_ejecuciones (regla_id, user_id, ejecutada_en desc);

-- 3) Tareas que dejan las automatizaciones para Miriam (por ejemplo, escribir a alguien por WhatsApp).
create table if not exists public.reglas_tareas (
  id uuid primary key default gen_random_uuid(),
  regla_id uuid references public.reglas_automaticas (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  texto text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'hecha')),
  creado_en timestamptz not null default now()
);
create index if not exists reglas_tareas_estado on public.reglas_tareas (estado, creado_en);

alter table public.reglas_automaticas enable row level security;
alter table public.reglas_ejecuciones enable row level security;
alter table public.reglas_tareas enable row level security;
revoke all on public.reglas_automaticas from anon, authenticated;
revoke all on public.reglas_ejecuciones from anon, authenticated;
revoke all on public.reglas_tareas from anon, authenticated;

-- 4) Las automatizaciones de siempre: elegir si avisan por correo, por la app y el móvil, o por los dos.
alter table public.automatizaciones add column if not exists canal_correo boolean not null default true;
alter table public.automatizaciones add column if not exists canal_app boolean not null default true;
