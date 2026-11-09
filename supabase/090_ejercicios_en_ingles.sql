-- Nombres en inglés de los ejercicios de la biblioteca.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- Solo rellena los que no tienen nombre en inglés (los que ya has escrito tú no se tocan).
-- Al final devuelve los ejercicios que se han quedado sin nombre en inglés, por si hay alguno que no esté en esta lista.

update public.ejercicios e
set nombre_en = v.en
from (values
  ('Colgada pasiva', 'Passive hang'),
  ('Colgada activa', 'Active hang'),
  ('Escapulares', 'Scapular pulls'),
  ('Remo australiano', 'Australian row'),
  ('Remo invertido', 'Inverted row'),
  ('Dominada con salto', 'Jumping pull-up'),
  ('Negativa de dominada', 'Negative pull-up'),
  ('Isométrico de dominada arriba', 'Top pull-up hold'),
  ('Isométrico de dominada a 90°', '90° pull-up hold'),
  ('Dominada con banda', 'Banded pull-up'),
  ('Dominada', 'Pull-up'),
  ('Dominada supina', 'Chin-up'),
  ('Hollow body hold', 'Hollow body hold'),
  ('Pike hold', 'Pike hold'),
  ('Wall walk', 'Wall walk'),
  ('Pino de cara a la pared', 'Wall handstand (chest to wall)'),
  ('Pino contra la pared', 'Wall handstand'),
  ('Despegues de pino', 'Handstand kick-ups'),
  ('Pino libre', 'Freestanding handstand'),
  ('Pino a una mano', 'One-arm handstand'),
  ('Flexiones en pino', 'Handstand push-ups'),
  ('Flexiones pike', 'Pike push-ups'),
  ('Muscle up', 'Muscle-up'),
  ('Front lever', 'Front lever'),
  ('Back lever', 'Back lever'),
  ('Planche tuck', 'Tuck planche'),
  ('Lean planche', 'Planche lean'),
  ('Bandera humana', 'Human flag'),
  ('L-sit', 'L-sit'),
  ('Fondos', 'Dips'),
  ('Fondos en paralelas', 'Parallel bar dips'),
  ('Fondos en banco', 'Bench dips'),
  ('Flexiones', 'Push-ups'),
  ('Flexiones diamante', 'Diamond push-ups'),
  ('Pistol squat', 'Pistol squat'),
  ('Sentadilla', 'Squat'),
  ('Sentadilla búlgara', 'Bulgarian split squat'),
  ('Zancadas', 'Lunges'),
  ('Plancha', 'Plank'),
  ('Plancha lateral', 'Side plank'),
  ('Puente de glúteo', 'Glute bridge'),
  ('Elevación de piernas', 'Leg raises'),
  ('Elevación de rodillas', 'Knee raises'),
  ('Movilidad de muñeca', 'Wrist mobility'),
  ('Movilidad de hombro', 'Shoulder mobility')
) as v(es, en)
where lower(e.nombre) = lower(v.es)
  and (e.nombre_en is null or btrim(e.nombre_en) = '');

-- Los que quedan sin nombre en inglés (si sale alguno, pásamelo y lo añado).
select nombre from public.ejercicios where nombre_en is null or btrim(nombre_en) = '' order by nombre;
