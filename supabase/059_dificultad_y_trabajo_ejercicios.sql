-- Dificultad de cada ejercicio (fácil, intermedio, difícil) y lo que trabaja (fuerza, resistencia, movilidad…, de 0 a 100).
-- No borra ni cambia nada: solo añade dos columnas vacías.
alter table public.ejercicios add column if not exists dificultad text
  check (dificultad is null or dificultad in ('facil', 'intermedio', 'dificil'));
alter table public.ejercicios add column if not exists trabajo jsonb;
