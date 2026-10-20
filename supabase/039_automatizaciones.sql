-- Automatizaciones: avisos y regalos automáticos que se revisan una vez al día.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. Cada automatización: interruptor, días (si aplica) y textos editables (español e inglés).
create table if not exists public.automatizaciones (
  clave text primary key check (clave in ('prueba_recordatorio', 'prueba_despues', 'bono_caduca', 'cumple')),
  activa boolean not null default true,
  dias int not null default 1 check (dias between 1 and 60),
  asunto_es text not null,
  mensaje_es text not null,
  asunto_en text not null,
  mensaje_en text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.automatizaciones enable row level security;
revoke all on public.automatizaciones from anon, authenticated;

insert into public.automatizaciones (clave, activa, dias, asunto_es, mensaje_es, asunto_en, mensaje_en) values
  ('prueba_recordatorio', true, 1,
   'Mañana es tu clase de prueba',
   E'Hola {nombre}, te recuerdo que tienes tu clase de prueba: {clase}, el {fecha}.\n\nVen con ropa cómoda y ganas de pasarlo bien. Si no puedes venir, cancélala desde la app.',
   'Your trial class is tomorrow',
   E'Hi {nombre}, a reminder that your trial class is coming up: {clase}, on {fecha}.\n\nWear comfortable clothes and bring good energy. If you can''t make it, please cancel from the app.'),
  ('prueba_despues', true, 1,
   '¿Qué tal tu clase de prueba?',
   E'Hola {nombre}, gracias por venir a tu clase de prueba. Espero que lo hayas pasado bien.\n\nSi quieres seguir entrenando, puedes elegir un bono desde la app y reservar tus próximas clases. Y si tienes cualquier duda, respóndeme a este correo.',
   'How was your trial class?',
   E'Hi {nombre}, thanks for coming to your trial class. I hope you enjoyed it.\n\nIf you want to keep training, you can pick a pass in the app and book your next classes. Any questions, just reply to this email.'),
  ('bono_caduca', true, 7,
   'Tu bono está a punto de caducar',
   E'Hola {nombre}, tu {bono} caduca el {fecha}. {clases}\n\nPara renovarlo, ponte en contacto conmigo.',
   'Your pass is about to expire',
   E'Hi {nombre}, your {bono} expires on {fecha}. {clases}\n\nTo renew it, get in touch with me.'),
  ('cumple', true, 1,
   '¡Feliz cumpleaños, {nombre}!',
   E'¡Feliz cumpleaños, {nombre}! Hoy es tu día y quiero celebrarlo contigo.\n\n{regalo}',
   'Happy birthday, {nombre}!',
   E'Happy birthday, {nombre}! It''s your day and I want to celebrate it with you.\n\n{regalo}')
on conflict (clave) do nothing;

-- 2. Regalos (clase gratis o videollamada) que se han dado por automatización.
create table if not exists public.regalos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('clase', 'videollamada')),
  motivo text not null default 'cumple',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'hecho')),
  creado_en timestamptz not null default now()
);

create index if not exists regalos_estado on public.regalos (estado, creado_en);

alter table public.regalos enable row level security;
revoke all on public.regalos from anon, authenticated;
grant select on public.regalos to authenticated;

drop policy if exists regalos_propios on public.regalos;
create policy regalos_propios on public.regalos for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- 3. El registro de avisos acepta los tipos nuevos.
alter table public.avisos_enviados drop constraint if exists avisos_enviados_tipo_check;
alter table public.avisos_enviados
  add constraint avisos_enviados_tipo_check
  check (tipo in ('bono_caduca', 'minimo_clase', 'prueba_recordatorio', 'prueba_despues', 'cumple'));
