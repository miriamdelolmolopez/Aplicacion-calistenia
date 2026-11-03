-- Nombre en inglés de las tarifas y de los tipos de clase (y talleres).
-- Si está vacío, se muestra el nombre en español. No borra ni cambia ningún nombre existente.

alter table public.tipos_bono add column if not exists nombre_en text check (nombre_en is null or char_length(nombre_en) between 1 and 100);
alter table public.tipos_clase add column if not exists nombre_en text check (nombre_en is null or char_length(nombre_en) between 1 and 80);

-- Traducciones de lo que ya existe (solo se ponen si todavía no tienen).
update public.tipos_bono set nombre_en = v.en
from (values
  ('8 clases grupales/mes presenciales', '8 group classes/month (in person)'),
  ('4 clases grupales/mes presenciales', '4 group classes/month (in person)'),
  ('12 clases grupales/mes presenciales', '12 group classes/month (in person)'),
  ('Clase suelta grupal presencial', 'Single group class (in person)'),
  ('10 clases grupales presenciales (3 meses)', '10 group classes (in person, 3 months)'),
  ('Clase suelta personal presencial', 'Single personal class (in person)'),
  ('4 clases personales/mes presenciales', '4 personal classes/month (in person)'),
  ('8 clases personales/mes presenciales', '8 personal classes/month (in person)'),
  ('8 clases personales/mes presenciales A.T', '8 personal classes/month (in person) A.T'),
  ('Online mensual', 'Monthly online plan'),
  ('Combinación 4 clases grupales+personales presenciales', 'Combo: 4 group + 4 personal classes (in person)')
) as v(es, en)
where public.tipos_bono.nombre = v.es and public.tipos_bono.nombre_en is null;

update public.tipos_clase set nombre_en = v.en
from (values
  ('Pino intermedio', 'Intermediate handstand'),
  ('Pino principiantes', 'Beginner handstand'),
  ('Calistenia', 'Calisthenics'),
  ('Entrenamiento personal', 'Personal training'),
  ('Estiramiento', 'Stretching'),
  ('Freestyle', 'Freestyle')
) as v(es, en)
where public.tipos_clase.nombre = v.es and public.tipos_clase.nombre_en is null;
