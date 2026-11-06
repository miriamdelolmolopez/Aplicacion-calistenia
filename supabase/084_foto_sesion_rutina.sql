-- 084: foto propia para cada sesión (día) de una rutina. No toca nada existente: solo añade una columna vacía.
alter table public.rutina_sesiones add column if not exists foto_url text;
