-- Frases de motivación que salen al azar sobre la foto de Inicio.
-- Miriam las edita desde Administración. Solo AÑADE una tabla.

create table if not exists public.frases_inicio (
  id uuid primary key default gen_random_uuid(),
  texto_es text not null check (char_length(texto_es) between 1 and 140),
  texto_en text not null check (char_length(texto_en) between 1 and 140),
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

alter table public.frases_inicio enable row level security;

drop policy if exists "frases_inicio se lee" on public.frases_inicio;
create policy "frases_inicio se lee" on public.frases_inicio for select to authenticated using (true);

insert into public.frases_inicio (texto_es, texto_en)
select * from (values
  ('La constancia también es una forma de amor propio.', 'Consistency is also a form of self-love.'),
  ('Hoy es un buen día para ser más fuerte que ayer.', 'Today is a good day to be stronger than yesterday.'),
  ('Un pequeño paso cada día sigue siendo avanzar.', 'A small step every day is still progress.'),
  ('Tu cuerpo puede, convence a tu mente.', 'Your body can do it, convince your mind.'),
  ('No tiene que ser perfecto, tiene que ser constante.', 'It doesn''t have to be perfect, it has to be consistent.'),
  ('Cada repetición cuenta.', 'Every rep counts.'),
  ('La fuerza se construye con paciencia.', 'Strength is built with patience.'),
  ('Respira, confía y empuja.', 'Breathe, trust and push.'),
  ('Lo difícil de hoy es lo fácil de mañana.', 'Today''s hard is tomorrow''s easy.'),
  ('Cuida de tu cuerpo, es tu hogar.', 'Take care of your body, it is your home.'),
  ('El pino empieza con un primer intento.', 'A handstand starts with a first try.'),
  ('Disfruta el proceso, no solo el resultado.', 'Enjoy the process, not just the result.')
) as v(es, en)
where not exists (select 1 from public.frases_inicio);
