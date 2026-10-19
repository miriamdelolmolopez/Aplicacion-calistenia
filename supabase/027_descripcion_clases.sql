-- Descripción de cada tipo de clase («Saber más» en Reservas).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: añade dos columnas y deja un borrador para las clases que ya existen.
-- Se puede cambiar desde Administración > Clases > Tipos de clase.

alter table public.tipos_clase add column if not exists descripcion text;
alter table public.tipos_clase add column if not exists descripcion_en text;

update public.tipos_clase set
  descripcion = 'Clase de entrenamiento con el peso de tu propio cuerpo: dominadas, flexiones, fondos, trabajo de core y movilidad. Se adapta a todos los niveles: cada ejercicio tiene una versión más fácil y otra más difícil para que progreses a tu ritmo. Trabajarás fuerza, resistencia y control corporal.',
  descripcion_en = 'A bodyweight training class: pull-ups, push-ups, dips, core work and mobility. It suits every level: each exercise has an easier and a harder version so you progress at your own pace. You will build strength, endurance and body control.'
where nombre = 'Calistenia' and descripcion is null;

update public.tipos_clase set
  descripcion = 'Tu primera clase de pino (handstand). Aprenderás la posición de la espalda, la alineación del cuerpo, cómo entrar al pino contra la pared y cómo salir de forma segura. Ideal si nunca has hecho pino o todavía no consigues mantenerlo.',
  descripcion_en = 'Your first handstand class. You will learn back position, body alignment, how to kick up against the wall and how to come out safely. Ideal if you have never done a handstand or cannot hold it yet.'
where nombre = 'Pino principiantes' and descripcion is null;

update public.tipos_clase set
  descripcion = 'Para quien ya se mantiene en pino contra la pared o hace sus primeros segundos libres. Trabajamos equilibrio, entradas, corrección de la línea, tiempo en pino y fuerza de hombros y core para dar el salto al pino libre.',
  descripcion_en = 'For those who can already hold a wall handstand or manage their first free seconds. We work on balance, entries, line correction, hold time and shoulder and core strength to move towards a free handstand.'
where nombre = 'Pino intermedio' and descripcion is null;

update public.tipos_clase set
  descripcion = 'Una hora solo para ti con Miriam. Un entrenamiento totalmente adaptado a tus objetivos, tu nivel y tu ritmo: pino, fuerza, flexibilidad o lo que necesites. Se corrige tu técnica de forma personalizada.',
  descripcion_en = 'One hour just for you with Miriam. A workout fully adapted to your goals, level and pace: handstand, strength, flexibility or whatever you need. Your technique is corrected one to one.'
where nombre = 'Entrenamiento personal' and descripcion is null;
