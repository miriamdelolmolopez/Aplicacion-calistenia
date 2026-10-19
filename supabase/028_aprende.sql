-- Contenido de Aprende: glosario, historia y preguntas del examen (editable desde Administración).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: crea tres tablas y mete un contenido inicial solo si están vacías.

create table if not exists public.glosario (
  id uuid primary key default gen_random_uuid(),
  termino_es text not null,
  termino_en text,
  definicion_es text not null,
  definicion_en text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.historia (
  id uuid primary key default gen_random_uuid(),
  titulo_es text not null,
  titulo_en text,
  texto_es text not null,
  texto_en text,
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.preguntas (
  id uuid primary key default gen_random_uuid(),
  pregunta_es text not null,
  pregunta_en text,
  opciones_es jsonb not null,
  opciones_en jsonb,
  correcta int not null check (correcta between 0 and 3),
  explicacion_es text,
  explicacion_en text,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.glosario enable row level security;
alter table public.historia enable row level security;
alter table public.preguntas enable row level security;

drop policy if exists "glosario se lee" on public.glosario;
create policy "glosario se lee" on public.glosario for select to authenticated using (true);
drop policy if exists "historia se lee" on public.historia;
create policy "historia se lee" on public.historia for select to authenticated using (true);
drop policy if exists "preguntas se leen" on public.preguntas;
create policy "preguntas se leen" on public.preguntas for select to authenticated using (true);

insert into public.glosario (termino_es, termino_en, definicion_es, definicion_en)
select * from (values
  ('Calistenia', 'Calisthenics', 'Entrenamiento de fuerza que usa el peso del propio cuerpo como resistencia: dominadas, flexiones, fondos, saltos y habilidades como el pino. Solo necesitas una barra, el suelo y ganas.', 'Strength training that uses your own bodyweight as resistance: pull-ups, push-ups, dips, jumps and skills such as the handstand. All you need is a bar, the floor and motivation.'),
  ('Pino', 'Handstand', 'Equilibrio sobre las manos con el cuerpo en vertical y las piernas hacia arriba. Trabaja hombros, core y equilibrio.', 'Balancing on your hands with the body vertical and the legs up. It works shoulders, core and balance.'),
  ('Pino contra la pared', 'Wall handstand', 'Variante en la que apoyas los pies (o el pecho) en la pared para mantener la posición. Es el primer paso para llegar al pino libre.', 'A variation where your feet (or chest) rest on the wall to hold the position. It is the first step towards a free handstand.'),
  ('Pino libre', 'Freestanding handstand', 'Pino sin apoyo: te equilibras solo con las manos, corrigiendo con los dedos y la muñeca.', 'A handstand with no support: you balance on your hands alone, correcting with your fingers and wrists.'),
  ('Wall walk', 'Wall walk', 'Ejercicio en el que subes con los pies por la pared mientras las manos caminan hacia ella hasta quedar en pino. Sirve para ganar fuerza, alineación y confianza.', 'An exercise where you walk your feet up the wall while your hands walk towards it until you reach a handstand. It builds strength, alignment and confidence.'),
  ('Muscle-up', 'Muscle-up', 'Movimiento que une una dominada y un fondo en una sola repetición: te elevas sobre la barra o las anillas hasta tener los brazos extendidos por encima.', 'A movement that joins a pull-up and a dip in one rep: you pull yourself over the bar or rings until your arms are extended above it.'),
  ('Dominada', 'Pull-up', 'Tirar del cuerpo hacia arriba, colgado de una barra, hasta pasar la barbilla de ella. Trabaja espalda y bíceps.', 'Pulling your body up while hanging from a bar until your chin passes it. It works back and biceps.'),
  ('Flexión', 'Push-up', 'Empuje en el suelo: bajas el pecho hacia el suelo y subes extendiendo los brazos. Trabaja pecho, hombros, tríceps y core.', 'A pushing exercise on the floor: you lower your chest towards the ground and push back up. It works chest, shoulders, triceps and core.'),
  ('Fondos', 'Dips', 'Empuje en paralelas o anillas: bajas flexionando los codos y subes extendiéndolos. Trabaja pecho, hombros y tríceps.', 'A pushing exercise on parallel bars or rings: you lower by bending the elbows and push back up. It works chest, shoulders and triceps.'),
  ('Front lever', 'Front lever', 'Posición estática colgada de una barra con el cuerpo recto y horizontal, mirando hacia arriba. Exige mucha fuerza de espalda y core.', 'A static hold hanging from a bar with the body straight and horizontal, facing up. It demands a lot of back and core strength.'),
  ('Back lever', 'Back lever', 'Posición estática colgada con el cuerpo horizontal mirando hacia abajo. Es más accesible que el front lever y se suele trabajar antes.', 'A static hold hanging with the body horizontal, facing down. It is more accessible than the front lever and is usually trained first.'),
  ('Planche', 'Planche', 'Cuerpo horizontal sostenido solo con las manos, con los brazos extendidos y sin apoyar los pies. Una de las habilidades más exigentes.', 'The body held horizontal on the hands alone, arms extended and feet off the ground. One of the most demanding skills.'),
  ('Bandera humana', 'Human flag', 'Cuerpo horizontal sujeto de lado a un poste vertical, empujando con un brazo y tirando con el otro.', 'The body held horizontal against a vertical pole, pushing with one arm and pulling with the other.'),
  ('L-sit', 'L-sit', 'Te sostienes con los brazos extendidos y las piernas rectas y horizontales delante, formando una L. Trabaja core, flexores de cadera y hombros.', 'You hold yourself up on straight arms with your legs straight and horizontal in front, forming an L. It works core, hip flexors and shoulders.'),
  ('Hollow body', 'Hollow body', 'Posición con la zona lumbar pegada al suelo y brazos y piernas extendidos y algo elevados. Es la base del core en gimnasia y calistenia.', 'A position with the lower back pressed to the floor and arms and legs extended and slightly raised. It is the foundation of core work in gymnastics and calisthenics.'),
  ('Core', 'Core', 'Músculos del tronco (abdominales, oblicuos y lumbares) que estabilizan el cuerpo y transmiten la fuerza entre brazos y piernas.', 'The muscles of the trunk (abs, obliques and lower back) that stabilise the body and transfer force between arms and legs.'),
  ('Isométrico (estático)', 'Isometric (static)', 'Ejercicio en el que mantienes una posición sin moverte, por ejemplo un pino, una plancha o un front lever.', 'An exercise where you hold a position without moving, for example a handstand, a plank or a front lever.'),
  ('Dinámico', 'Dynamic', 'Ejercicio con movimiento: dominadas, flexiones, fondos o muscle-ups. El músculo se acorta y se alarga en cada repetición.', 'An exercise with movement: pull-ups, push-ups, dips or muscle-ups. The muscle shortens and lengthens on every rep.'),
  ('Repetición', 'Repetition (rep)', 'Cada vez que haces un movimiento completo del ejercicio.', 'Each time you complete the full movement of an exercise.'),
  ('Serie', 'Set', 'Grupo de repeticiones seguidas, sin descanso, antes de parar.', 'A group of repetitions done in a row, without rest, before you stop.'),
  ('Progresión', 'Progression', 'Versión más difícil de un ejercicio, o el camino ordenado de versiones que te acerca a una habilidad.', 'A harder version of an exercise, or the ordered path of versions that brings you closer to a skill.'),
  ('Regresión', 'Regression', 'Versión más fácil de un ejercicio, para hacerlo con buena técnica mientras ganas fuerza.', 'An easier version of an exercise, so you can do it with good technique while you build strength.'),
  ('Lastre', 'Weighted', 'Peso extra que añades al cuerpo (chaleco, cinturón con disco o mochila) para que el ejercicio sea más difícil.', 'Extra weight added to the body (a vest, a belt with a plate or a backpack) to make an exercise harder.'),
  ('Excéntrico (negativa)', 'Eccentric (negative)', 'Fase del movimiento en la que el músculo se alarga mientras controla el peso, por ejemplo bajar despacio en una dominada. Muy útil para aprender un ejercicio nuevo.', 'The phase of a movement where the muscle lengthens while controlling the load, for example lowering slowly in a pull-up. Very useful for learning a new exercise.'),
  ('Tempo', 'Tempo', 'La velocidad de cada fase del ejercicio. Un tempo 3-1-1 significa 3 segundos bajando, 1 de pausa y 1 subiendo.', 'The speed of each phase of an exercise. A 3-1-1 tempo means 3 seconds down, 1 second pause and 1 second up.'),
  ('AMRAP', 'AMRAP', '«As many reps as possible»: tantas repeticiones (o rondas) como puedas en un tiempo o en una serie.', '"As many reps as possible": as many repetitions (or rounds) as you can in a set time or in one set.'),
  ('Anillas', 'Rings', 'Aparato colgante e inestable. Al moverse, obliga a trabajar más el control y la estabilidad.', 'A hanging, unstable apparatus. Because it moves, it demands more control and stability.'),
  ('Paralelas', 'Parallel bars', 'Dos barras paralelas a la altura de la cadera o el pecho, usadas para fondos, L-sit y trabajo de empuje.', 'Two parallel bars at hip or chest height, used for dips, L-sits and pushing work.'),
  ('Banda elástica', 'Resistance band', 'Banda que ayuda a hacer un ejercicio más fácil (asistencia) o que añade resistencia. Muy usada en las progresiones.', 'A band that makes an exercise easier (assistance) or adds resistance. Widely used in progressions.'),
  ('Movilidad', 'Mobility', 'Capacidad de mover una articulación con control en todo su rango. Es clave en hombros, muñecas y cadera para el pino y las habilidades.', 'The ability to move a joint with control through its full range. It is key in shoulders, wrists and hips for handstands and skills.')
) as v (termino_es, termino_en, definicion_es, definicion_en)
where not exists (select 1 from public.glosario);

insert into public.historia (titulo_es, titulo_en, texto_es, texto_en, orden)
select * from (values
  ('El origen de la calistenia', 'The origins of calisthenics', 'La palabra calistenia viene del griego: «kalós» (belleza) y «sthénos» (fuerza). Ya en la Antigua Grecia se entrenaba con el propio cuerpo para prepararse para la guerra y para los juegos, y se cuenta que los soldados espartanos la practicaban a diario.

En el siglo XIX la gimnasia moderna en Alemania y Suecia la convirtió en un sistema de ejercicios con barras, paralelas y anillas. Más tarde pasó al entrenamiento militar y a las escuelas.

En los años 2000 resurgió en la calle con el street workout, sobre todo en parques de Europa del Este y de Nueva York, donde se ven barras y paralelas. Hoy es una disciplina deportiva con competiciones y una gran comunidad.', 'The word calisthenics comes from Greek: "kalós" (beauty) and "sthénos" (strength). In Ancient Greece people already trained with their own bodies to prepare for war and for the games, and Spartan soldiers are said to have practised it daily.

In the 19th century modern gymnastics in Germany and Sweden turned it into a system of exercises on bars, parallel bars and rings. Later it passed into military training and schools.

In the 2000s it came back to the street as street workout, especially in parks in Eastern Europe and New York, where bars and parallel bars are common. Today it is a sport with competitions and a big community.', 1),
  ('Resistencia', 'Endurance', 'La calistenia de resistencia busca hacer muchas repeticiones o mantener un esfuerzo durante mucho tiempo: series largas de dominadas, flexiones o fondos, circuitos y rutinas con poco descanso.

Mejora la capacidad de aguantar el esfuerzo, la fuerza resistencia y la condición física general. Es una buena forma de empezar y de construir una base antes de pasar a habilidades más difíciles.', 'Endurance calisthenics aims to do many repetitions or sustain effort for a long time: long sets of pull-ups, push-ups or dips, circuits and routines with little rest.

It improves your ability to keep going, strength endurance and general fitness. It is a good way to start and to build a base before moving on to harder skills.', 2),
  ('Estáticos', 'Statics', 'Los estáticos (o isométricos) son habilidades que se mantienen quietas durante unos segundos: front lever, back lever, planche, bandera humana, L-sit o el propio pino.

Exigen mucha fuerza, control del cuerpo y paciencia. Se progresa con versiones más fáciles, como tuck o straddle, e intentando aguantar un poco más cada vez.', 'Statics (or isometrics) are skills held still for a few seconds: front lever, back lever, planche, human flag, L-sit or the handstand itself.

They demand a lot of strength, body control and patience. You progress with easier versions, such as tuck or straddle, and by trying to hold a little longer each time.', 3),
  ('Dinámicos', 'Dynamics', 'Los movimientos dinámicos son los que se hacen con movimiento y, a menudo, con explosividad: muscle-ups, dominadas explosivas, flexiones con palmada, saltos y transiciones.

Trabajan la potencia, la coordinación y el ritmo. Es la parte más espectacular del street workout y de las exhibiciones de freestyle.', 'Dynamic movements are those done with motion and often with explosiveness: muscle-ups, explosive pull-ups, clapping push-ups, jumps and transitions.

They build power, coordination and rhythm. It is the most spectacular side of street workout and freestyle shows.', 4),
  ('Air', 'Air', 'Con «air» nos referimos al trabajo en suspensión y en el aire: colgarse de aparatos, girar, balancearse y combinar fuerza con fluidez de movimiento.

El cuerpo no se apoya en el suelo, así que se trabajan la fuerza de agarre, el core y la conciencia corporal.', '"Air" refers to work in suspension and in the air: hanging from apparatus, turning, swinging and combining strength with fluid movement.

The body is not supported by the floor, so grip strength, core and body awareness are trained.', 5),
  ('Lastre', 'Weighted calisthenics', 'La calistenia con lastre añade peso extra al cuerpo: un chaleco, un cinturón con disco o una mochila. Se usa para hacer más difíciles ejercicios que ya dominas, como dominadas o fondos con peso.

Permite seguir ganando fuerza sin necesidad de pasar a versiones más complejas, y es una buena herramienta para llegar a habilidades como el muscle-up.', 'Weighted calisthenics adds extra weight to the body: a vest, a belt with a plate or a backpack. It is used to make exercises you already master harder, such as weighted pull-ups or dips.

It lets you keep getting stronger without moving on to more complex versions, and it is a good tool on the way to skills such as the muscle-up.', 6),
  ('Airdance', 'Airdance', 'El airdance une la danza con el movimiento en el aire: coreografías y transiciones fluidas con aparatos suspendidos. Mezcla fuerza, flexibilidad y expresión artística.

Es una forma más artística de entender la calistenia y la acrobacia, y pone el foco en la fluidez, la gracia y la creatividad.', 'Airdance joins dance with movement in the air: fluid choreography and transitions on suspended apparatus. It mixes strength, flexibility and artistic expression.

It is a more artistic way of understanding calisthenics and acrobatics, focusing on fluidity, grace and creativity.', 7),
  ('Pino (handstand)', 'Handstand', 'El pino es el equilibrio sobre las manos con el cuerpo en vertical. Viene de la gimnasia y de las artes circenses, y se ha convertido en una de las habilidades más buscadas de la calistenia.

Se aprende por pasos: calentar muñecas y hombros, aprender la línea del cuerpo, entrar contra la pared, mantenerse y, por último, equilibrarse en pino libre. Después llegan variantes como el pino con una mano o las presses (subir al pino con fuerza).', 'The handstand is balancing on your hands with the body vertical. It comes from gymnastics and circus arts and has become one of the most sought-after skills in calisthenics.

It is learned step by step: warming up wrists and shoulders, learning the body line, kicking up against the wall, holding it and, finally, balancing freely. Later come variations such as the one-arm handstand or presses (raising into a handstand with strength).', 8)
) as v (titulo_es, titulo_en, texto_es, texto_en, orden)
where not exists (select 1 from public.historia);

insert into public.preguntas (pregunta_es, opciones_es, correcta, explicacion_es, pregunta_en, opciones_en, explicacion_en)
select * from (values
  ('¿De qué idioma viene la palabra «calistenia»?', '["Latín","Griego","Francés","Inglés"]'::jsonb, 1, 'Viene del griego «kalós» (belleza) y «sthénos» (fuerza).', 'Which language does the word "calisthenics" come from?', '["Latin","Greek","French","English"]'::jsonb, 'It comes from Greek: "kalós" (beauty) and "sthénos" (strength).'),
  ('¿Qué usa como resistencia la calistenia?', '["Máquinas de gimnasio","Mancuernas","El peso del propio cuerpo","Gomas y poleas"]'::jsonb, 2, 'La calistenia usa el peso del propio cuerpo.', 'What does calisthenics use as resistance?', '["Gym machines","Dumbbells","Your own bodyweight","Bands and pulleys"]'::jsonb, 'Calisthenics uses your own bodyweight.'),
  ('¿Qué es un pino?', '["Un equilibrio sobre las manos con el cuerpo en vertical","Un salto con giro","Un tipo de flexión","Una posición sentada"]'::jsonb, 0, 'El pino (handstand) es el equilibrio sobre las manos.', 'What is a handstand?', '["A balance on your hands with the body vertical","A jump with a turn","A type of push-up","A seated position"]'::jsonb, 'A handstand is a balance on your hands.'),
  ('¿Cuál es el primer paso habitual para llegar al pino libre?', '["Hacerlo con una sola mano","Practicarlo contra la pared","Hacerlo con los ojos cerrados","Practicarlo sin calentar"]'::jsonb, 1, 'Se empieza contra la pared para ganar fuerza y alineación.', 'What is the usual first step towards a free handstand?', '["Doing it on one hand","Practising against the wall","Doing it with eyes closed","Practising without warming up"]'::jsonb, 'You start against the wall to build strength and alignment.'),
  ('¿Qué combina un muscle-up?', '["Una dominada y un fondo","Una flexión y una sentadilla","Un pino y una voltereta","Un salto y un giro"]'::jsonb, 0, 'El muscle-up une una dominada y un fondo en una sola repetición.', 'What does a muscle-up combine?', '["A pull-up and a dip","A push-up and a squat","A handstand and a roll","A jump and a turn"]'::jsonb, 'A muscle-up joins a pull-up and a dip in one rep.'),
  ('¿Qué músculos trabaja principalmente una dominada?', '["Espalda y bíceps","Pecho y tríceps","Piernas","Gemelos"]'::jsonb, 0, 'La dominada trabaja sobre todo espalda y bíceps.', 'Which muscles does a pull-up mainly work?', '["Back and biceps","Chest and triceps","Legs","Calves"]'::jsonb, 'A pull-up mainly works the back and biceps.'),
  ('¿Qué ejercicio se hace en paralelas bajando y subiendo con los codos?', '["Dominada","Fondos","Plancha","Wall walk"]'::jsonb, 1, 'Los fondos (dips) se hacen en paralelas o anillas.', 'Which exercise is done on parallel bars lowering and raising with the elbows?', '["Pull-up","Dips","Plank","Wall walk"]'::jsonb, 'Dips are done on parallel bars or rings.'),
  ('¿Cómo está el cuerpo en el front lever?', '["Horizontal, colgado y mirando hacia arriba","Vertical con la cabeza abajo","Sentado en el suelo","Horizontal apoyado en las manos"]'::jsonb, 0, 'En el front lever el cuerpo está recto y horizontal, colgado de una barra y mirando hacia arriba.', 'How is the body in the front lever?', '["Horizontal, hanging and facing up","Vertical with the head down","Sitting on the floor","Horizontal resting on the hands"]'::jsonb, 'In the front lever the body is straight and horizontal, hanging from a bar and facing up.'),
  ('¿Qué habilidad se sostiene horizontal solo con las manos?', '["Planche","Back lever","L-sit","Hollow body"]'::jsonb, 0, 'En el planche el cuerpo está horizontal y solo se apoyan las manos.', 'Which skill is held horizontal on the hands alone?', '["Planche","Back lever","L-sit","Hollow body"]'::jsonb, 'In the planche the body is horizontal and only the hands touch the ground.'),
  ('¿Qué forma tiene el cuerpo en un L-sit?', '["Una L","Una U","Una X","Una O"]'::jsonb, 0, 'Brazos extendidos y piernas rectas delante formando una L.', 'What shape does the body make in an L-sit?', '["An L","A U","An X","An O"]'::jsonb, 'Arms extended and legs straight in front, forming an L.'),
  ('¿Qué es el core?', '["Los músculos del tronco que estabilizan el cuerpo","Los músculos de las piernas","Los músculos del cuello","Los músculos de las manos"]'::jsonb, 0, 'El core son abdominales, oblicuos y lumbares.', 'What is the core?', '["The trunk muscles that stabilise the body","The leg muscles","The neck muscles","The hand muscles"]'::jsonb, 'The core is abs, obliques and lower back.'),
  ('¿Qué es un ejercicio isométrico?', '["Uno en el que mantienes la posición sin moverte","Uno en el que saltas","Uno con muchas repeticiones rápidas","Uno que se hace con peso"]'::jsonb, 0, 'Isométrico o estático: se mantiene una posición.', 'What is an isometric exercise?', '["One where you hold a position without moving","One where you jump","One with many fast reps","One done with weight"]'::jsonb, 'Isometric or static: you hold a position.'),
  ('¿Cuál de estos es un ejercicio dinámico?', '["Dominada","Front lever mantenido","Plancha mantenida","Pino mantenido"]'::jsonb, 0, 'La dominada tiene movimiento en cada repetición.', 'Which of these is a dynamic exercise?', '["Pull-up","Held front lever","Held plank","Held handstand"]'::jsonb, 'A pull-up involves movement on every rep.'),
  ('¿Qué es una serie?', '["Un grupo de repeticiones seguidas antes de descansar","Un día de entrenamiento","Un tipo de aparato","Un calentamiento"]'::jsonb, 0, 'Una serie es un grupo de repeticiones seguidas.', 'What is a set?', '["A group of reps done in a row before resting","A training day","A type of apparatus","A warm-up"]'::jsonb, 'A set is a group of reps done in a row.'),
  ('¿Qué es una regresión?', '["Una versión más fácil de un ejercicio","Una versión más difícil","Un descanso largo","Un tipo de estiramiento"]'::jsonb, 0, 'Una regresión es una versión más fácil.', 'What is a regression?', '["An easier version of an exercise","A harder version","A long rest","A type of stretch"]'::jsonb, 'A regression is an easier version.'),
  ('¿Qué es una progresión?', '["Una versión más difícil de un ejercicio","Una versión más fácil","Una pausa entre series","Un calentamiento"]'::jsonb, 0, 'Una progresión es una versión más difícil o el camino de versiones hacia una habilidad.', 'What is a progression?', '["A harder version of an exercise","An easier version","A pause between sets","A warm-up"]'::jsonb, 'A progression is a harder version or the path of versions towards a skill.'),
  ('¿Qué significa entrenar con lastre?', '["Añadir peso extra al cuerpo","Entrenar más rápido","Entrenar con los ojos cerrados","Entrenar sin descanso"]'::jsonb, 0, 'Con lastre se añade peso extra: chaleco, cinturón o mochila.', 'What does training weighted mean?', '["Adding extra weight to the body","Training faster","Training with eyes closed","Training without rest"]'::jsonb, 'Weighted training adds extra weight: a vest, belt or backpack.'),
  ('¿Qué es la fase excéntrica de una dominada?', '["Bajar controlando el peso","Subir con fuerza","Mantenerse arriba","Soltarse de la barra"]'::jsonb, 0, 'La fase excéntrica es cuando el músculo se alarga controlando el peso, como al bajar despacio.', 'What is the eccentric phase of a pull-up?', '["Lowering while controlling the load","Pulling up with force","Holding at the top","Letting go of the bar"]'::jsonb, 'The eccentric phase is when the muscle lengthens while controlling the load, such as lowering slowly.'),
  ('¿Qué indica un tempo 3-1-1?', '["3 s bajando, 1 s de pausa y 1 s subiendo","3 series de 1 repetición","3 minutos de descanso","3 ejercicios en 1 día"]'::jsonb, 0, 'El tempo marca la velocidad de cada fase del ejercicio.', 'What does a 3-1-1 tempo mean?', '["3 s down, 1 s pause and 1 s up","3 sets of 1 rep","3 minutes of rest","3 exercises in 1 day"]'::jsonb, 'Tempo sets the speed of each phase of the exercise.'),
  ('¿Qué significa AMRAP?', '["Tantas repeticiones como puedas","Siempre con peso","Descanso máximo","Solo para avanzados"]'::jsonb, 0, 'AMRAP: «as many reps as possible».', 'What does AMRAP mean?', '["As many reps as possible","Always weighted","Maximum rest","Only for advanced"]'::jsonb, 'AMRAP: "as many reps as possible".'),
  ('¿Qué obliga a trabajar más las anillas respecto a una barra fija?', '["El control y la estabilidad","El peso","La velocidad","La altura"]'::jsonb, 0, 'Las anillas se mueven, así que exigen más control y estabilidad.', 'What do rings demand more of than a fixed bar?', '["Control and stability","Weight","Speed","Height"]'::jsonb, 'Rings move, so they demand more control and stability.'),
  ('¿Qué es el wall walk?', '["Subir con los pies por la pared mientras las manos caminan hacia ella","Caminar por la pared con zapatillas","Un tipo de sentadilla","Una carrera de resistencia"]'::jsonb, 0, 'Es un ejercicio para ganar fuerza y confianza en el pino.', 'What is a wall walk?', '["Walking your feet up the wall while your hands walk towards it","Walking along a wall in trainers","A type of squat","An endurance run"]'::jsonb, 'It is an exercise to build strength and confidence for the handstand.'),
  ('¿Qué calentamos especialmente antes de hacer un pino?', '["Muñecas y hombros","Solo los tobillos","Los dedos de los pies","Nada, no hace falta"]'::jsonb, 0, 'Las muñecas y los hombros soportan el peso en el pino.', 'What do we especially warm up before a handstand?', '["Wrists and shoulders","Only the ankles","The toes","Nothing, it is not needed"]'::jsonb, 'Wrists and shoulders carry the weight in a handstand.'),
  ('¿Qué mejora la calistenia de resistencia?', '["La capacidad de aguantar el esfuerzo","Solo la flexibilidad","Solo el equilibrio","Solo la potencia"]'::jsonb, 0, 'Mejora la fuerza resistencia y la condición física general.', 'What does endurance calisthenics improve?', '["The ability to sustain effort","Only flexibility","Only balance","Only power"]'::jsonb, 'It improves strength endurance and general fitness.'),
  ('¿Qué tipo de habilidades son front lever, planche y bandera humana?', '["Estáticos","Saltos","Estiramientos","Calentamientos"]'::jsonb, 0, 'Son habilidades estáticas que se mantienen quietas.', 'What kind of skills are front lever, planche and human flag?', '["Statics","Jumps","Stretches","Warm-ups"]'::jsonb, 'They are static skills held still.'),
  ('¿Qué trabaja el movimiento dinámico y explosivo?', '["La potencia y la coordinación","Solo la flexibilidad","Solo el equilibrio","Nada en concreto"]'::jsonb, 0, 'Los dinámicos trabajan potencia, coordinación y ritmo.', 'What does dynamic, explosive movement work on?', '["Power and coordination","Only flexibility","Only balance","Nothing in particular"]'::jsonb, 'Dynamics build power, coordination and rhythm.'),
  ('¿Qué es una banda elástica en calistenia?', '["Una ayuda para hacer un ejercicio más fácil o añadir resistencia","Un tipo de barra","Un calzado especial","Un calentamiento"]'::jsonb, 0, 'Se usa en las progresiones como ayuda o resistencia.', 'What is a resistance band in calisthenics?', '["An aid to make an exercise easier or add resistance","A type of bar","A special shoe","A warm-up"]'::jsonb, 'It is used in progressions as assistance or resistance.'),
  ('¿Qué es la movilidad?', '["Mover una articulación con control en todo su rango","Correr rápido","Levantar mucho peso","Descansar entre series"]'::jsonb, 0, 'La movilidad es clave en hombros, muñecas y cadera.', 'What is mobility?', '["Moving a joint with control through its full range","Running fast","Lifting heavy","Resting between sets"]'::jsonb, 'Mobility is key in shoulders, wrists and hips.'),
  ('¿Dónde resurgió con fuerza la calistenia en los años 2000?', '["En la calle, con el street workout","Solo en las piscinas","Únicamente en los gimnasios","En las escuelas de baile"]'::jsonb, 0, 'Resurgió en parques de Europa del Este y Nueva York como street workout.', 'Where did calisthenics resurge strongly in the 2000s?', '["On the street, as street workout","Only in swimming pools","Only in gyms","In dance schools"]'::jsonb, 'It resurged in parks in Eastern Europe and New York as street workout.'),
  ('¿Cuál es una forma de empezar a prepararse para el muscle-up?', '["Dominadas y fondos con lastre","Solo estirar","Correr largas distancias","Hacer pino libre"]'::jsonb, 0, 'Dominadas y fondos con peso dan fuerza para el muscle-up.', 'What is one way to start preparing for the muscle-up?', '["Weighted pull-ups and dips","Only stretching","Running long distances","Free handstand"]'::jsonb, 'Weighted pull-ups and dips build strength for the muscle-up.')
) as v (pregunta_es, opciones_es, correcta, explicacion_es, pregunta_en, opciones_en, explicacion_en)
where not exists (select 1 from public.preguntas);
