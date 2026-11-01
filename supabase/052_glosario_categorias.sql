-- Categorías del glosario (para filtrar). No borra nada: añade una columna y reparte los términos que ya existen.
alter table public.glosario add column if not exists categoria text;

update public.glosario set categoria = 'ejercicios'
where categoria is null and termino_es in ('Dominada', 'Flexión', 'Fondos', 'Muscle-up', 'Wall walk');

update public.glosario set categoria = 'habilidades'
where categoria is null and termino_es in ('Pino', 'Pino contra la pared', 'Pino libre', 'Front lever', 'Back lever', 'Planche', 'Bandera humana', 'L-sit', 'Hollow body');

update public.glosario set categoria = 'material'
where categoria is null and termino_es in ('Anillas', 'Paralelas', 'Banda elástica');

update public.glosario set categoria = 'conceptos' where categoria is null;
