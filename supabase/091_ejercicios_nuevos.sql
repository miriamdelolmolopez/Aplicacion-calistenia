-- Ejercicios nuevos de la biblioteca (pino, anillas, core y movilidad). No toca los que ya existen con el mismo nombre.
insert into public.materiales (nombre, nombre_en, orden) values ('Cajón', 'Box', 100) on conflict do nothing;

with nuevos(nombre, nombre_en, categoria, tipo, dificultad, trabajo, descripcion, descripcion_en, musculos, materiales) as (values
('Despegue y aguante: pino en attitude, pecho a la pared', 'Take-off and hold: attitude handstand, chest to wall', 'pino', 'duracion', 'intermedio', '{"fuerza":60,"equilibrio":90,"resistencia":40}'::jsonb, 'De cara a la pared, extiende una pierna recta para calcular a qué distancia colocar las manos.
Gírate, de modo que el pecho mire a la pared, y apoya las manos a esa distancia.
Apoya la espinilla de la pierna de la pared con la rodilla doblada a 90°, y lleva la otra pierna hacia atrás también doblada a 90°, formando la figura del pino en attitude.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Con una buena retroversión pélvica y todo el cuerpo apretado, inclínate un poco sin sacar la cabeza y haz un poco de fuerza con el talón de la mano para separarte solo/a de la pared: no te empuja el pie, te mueves tú con la mano.
Cuando te despegues, frena con una sola pulsación de la yema de los dedos para no caerte. Nada de apretar de forma prolongada, porque te devolvería a la pared.
Cuando empieces a volver hacia atrás, haz fuerza otra vez con el talón de la mano y frena de nuevo con la yema de los dedos. Aguanta el equilibrio así, con pequeños toques de la yema de los dedos y del talón de la mano.
Un ejercicio de duración: se trata de aguantar unos segundos sin tocar la pared.', 'Facing the wall, extend one straight leg to work out how far from the wall to place your hands.
Turn so your chest faces the wall and place your hands at that distance.
Rest the leg on the wall with the knee bent at 90°, and take the other leg back, also bent at 90°, forming the attitude handstand shape.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
With a good posterior pelvic tilt and your whole body tight, lean slightly without moving your head and press a little with the heel of your hand to separate from the wall on your own: your foot does not push you, your hand does.
Once you take off, brake with a single press of your fingertips so you do not fall. Do not press for long, or you will be sent back to the wall.
When you start to drift backwards, press again with the heel of your hand and brake again with your fingertips. Hold the balance like this, with small touches of the fingertips and the heel of the hand.
A duration exercise: the goal is to hold for a few seconds without touching the wall.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared,Paralelas'),
('Despegue y aguante: pino con piernas abiertas (straddle), pecho a la pared', 'Take-off and hold: straddle handstand, chest to wall', 'pino', 'duracion', 'intermedio', '{"fuerza":60,"equilibrio":90,"resistencia":40}'::jsonb, 'De cara a la pared, extiende una pierna recta para calcular a qué distancia colocar las manos.
Gírate, de modo que el pecho mire a la pared, y apoya las manos a esa distancia.
Acerca las manos un poco más a la pared y apoya las piernas abiertas (straddle) contra ella.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Adelanta un poco más la cadera, siempre con retroversión pélvica y el glúteo bien apretado: así compensas el peso de las piernas, que quedan más cerca de la pared.
Con una buena retroversión pélvica y todo el cuerpo apretado, inclínate un poco sin sacar la cabeza y haz un poco de fuerza con el talón de la mano para separarte solo/a de la pared: no te empuja el pie, te mueves tú con la mano.
Cuando te despegues, frena con una sola pulsación de la yema de los dedos para no caerte. Nada de apretar de forma prolongada, porque te devolvería a la pared.
Cuando empieces a volver hacia atrás, haz fuerza otra vez con el talón de la mano y frena de nuevo con la yema de los dedos. Aguanta el equilibrio así, con pequeños toques de la yema de los dedos y del talón de la mano.
Un ejercicio de duración: aguanta unos segundos sin tocar la pared.', 'Facing the wall, extend one straight leg to work out how far from the wall to place your hands.
Turn so your chest faces the wall and place your hands at that distance.
Place your hands a little closer to the wall and rest your open legs (straddle) against it.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
Bring your hips slightly further forward, always with a posterior pelvic tilt and tight glutes: this balances the weight of the legs, which sit closer to the wall.
With a good posterior pelvic tilt and your whole body tight, lean slightly without moving your head and press a little with the heel of your hand to separate from the wall on your own: your foot does not push you, your hand does.
Once you take off, brake with a single press of your fingertips so you do not fall. Do not press for long, or you will be sent back to the wall.
When you start to drift backwards, press again with the heel of your hand and brake again with your fingertips. Hold the balance like this, with small touches of the fingertips and the heel of the hand.
A duration exercise: hold for a few seconds without touching the wall.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario,abductores:secundario', 'Pared,Paralelas'),
('Despegue y aguante: pino en flamenco, pecho a la pared', 'Take-off and hold: flamingo handstand, chest to wall', 'pino', 'duracion', 'intermedio', '{"fuerza":60,"equilibrio":90,"resistencia":40}'::jsonb, 'De cara a la pared, extiende una pierna recta para calcular a qué distancia colocar las manos.
Gírate, de modo que el pecho mire a la pared, y apoya las manos a esa distancia.
Estira una pierna hacia arriba y baja la otra hasta apoyar en la pared la rodilla, la espinilla y el empeine, con la rodilla doblada a 90° respecto al torso (la forma de un flamenco).
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Con una buena retroversión pélvica y todo el cuerpo apretado, inclínate un poco sin sacar la cabeza y haz un poco de fuerza con el talón de la mano para separarte solo/a de la pared: no te empuja el pie, te mueves tú con la mano.
Cuando te despegues, frena con una sola pulsación de la yema de los dedos para no caerte. Nada de apretar de forma prolongada, porque te devolvería a la pared.
Cuando empieces a volver hacia atrás, haz fuerza otra vez con el talón de la mano y frena de nuevo con la yema de los dedos. Aguanta el equilibrio así, con pequeños toques de la yema de los dedos y del talón de la mano.
Un ejercicio de duración: aguanta unos segundos sin tocar la pared.', 'Facing the wall, extend one straight leg to work out how far from the wall to place your hands.
Turn so your chest faces the wall and place your hands at that distance.
Extend one leg upwards and lower the other until the knee, shin and top of the foot rest on the wall, with the knee bent at 90° to the torso (the shape of a flamingo).
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
With a good posterior pelvic tilt and your whole body tight, lean slightly without moving your head and press a little with the heel of your hand to separate from the wall on your own: your foot does not push you, your hand does.
Once you take off, brake with a single press of your fingertips so you do not fall. Do not press for long, or you will be sent back to the wall.
When you start to drift backwards, press again with the heel of your hand and brake again with your fingertips. Hold the balance like this, with small touches of the fingertips and the heel of the hand.
A duration exercise: hold for a few seconds without touching the wall.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared,Paralelas'),
('Despegue y aguante: pino cerrado, pecho a la pared', 'Take-off and hold: closed handstand, chest to wall', 'pino', 'duracion', 'dificil', '{"fuerza":60,"equilibrio":90,"resistencia":40}'::jsonb, 'De cara a la pared, extiende una pierna recta para calcular a qué distancia colocar las manos.
Gírate, de modo que el pecho mire a la pared, y apoya las manos a esa distancia.
Sube las dos piernas juntas y estiradas hasta apoyarlas en la pared, en pino cerrado.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Con una buena retroversión pélvica y todo el cuerpo apretado, inclínate un poco sin sacar la cabeza y haz un poco de fuerza con el talón de la mano para separarte solo/a de la pared: no te empuja el pie, te mueves tú con la mano.
Cuando te despegues, frena con una sola pulsación de la yema de los dedos para no caerte. Nada de apretar de forma prolongada, porque te devolvería a la pared.
Cuando empieces a volver hacia atrás, haz fuerza otra vez con el talón de la mano y frena de nuevo con la yema de los dedos. Aguanta el equilibrio así, con pequeños toques de la yema de los dedos y del talón de la mano.
A diferencia de «Despegues en pino pecho a la pared», aquí no vuelves a la pared: te despegas y aguantas el equilibrio en duración.', 'Facing the wall, extend one straight leg to work out how far from the wall to place your hands.
Turn so your chest faces the wall and place your hands at that distance.
Bring both straight legs together up to the wall in a closed handstand.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
With a good posterior pelvic tilt and your whole body tight, lean slightly without moving your head and press a little with the heel of your hand to separate from the wall on your own: your foot does not push you, your hand does.
Once you take off, brake with a single press of your fingertips so you do not fall. Do not press for long, or you will be sent back to the wall.
When you start to drift backwards, press again with the heel of your hand and brake again with your fingertips. Hold the balance like this, with small touches of the fingertips and the heel of the hand.
Unlike the wall handstand take-offs, here you do not return to the wall: you separate and hold the balance for time.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared,Paralelas'),
('Lanzadas en L a pino, espalda a la pared (sin tocar la pared)', 'L-shaped handstand kick-ups, back to wall (no wall touch)', 'pino', 'repeticiones', 'intermedio', '{"fuerza":40,"equilibrio":80,"resistencia":20}'::jsonb, 'De espaldas a la pared, coloca los hombros encima de las muñecas, empujando el suelo, con los codos bloqueados y la cabeza entre los hombros, mirando entre las manos.
Lanza una pierna recta hacia arriba y deja la otra en L, formando un ángulo de 90°.
La intención es no tocar la pared: lánzate despacio y de forma controlada, y frena con la yema de los dedos presionando contra el suelo.
Para no caerte hacia el suelo otra vez, presiona con el talón de la mano y juega con la mano para encontrar el equilibrio.
Si te caes hacia el suelo, saca un poco la cadera hacia la pared, sin llegar a tocarla. Es la cadera la que busca la pared, no la pierna.
Activa abdomen y glúteos, con retroversión pélvica y los pies en punta.', 'With your back to the wall, stack your shoulders over your wrists, pushing the floor away, elbows locked and head between your shoulders, eyes between your hands.
Kick one leg up straight and keep the other in an L, forming a 90° angle.
The aim is not to touch the wall: kick up slowly and in a controlled way, and brake with your fingertips by pressing into the floor.
To avoid falling back to the floor, press with the heel of your hand and keep playing with your hand to find the balance.
If you start to fall to the floor, move your hips slightly towards the wall without touching it. The hips look for the wall, not the leg.
Brace abs and glutes, with a posterior pelvic tilt and pointed toes.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared'),
('Pino con apoyo de cabeza', 'Handstand with head support', 'pino', 'duracion', 'intermedio', '{"fuerza":55,"equilibrio":70,"resistencia":30}'::jsonb, 'Coloca un cajón (o una silla o un sillón) apoyado en la pared, a una altura donde puedas apoyar la cabeza y tener las manos debajo, rectas.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Es un pino normal con las manos en el suelo, solo que apoyas la cabeza en el cajón (no en el suelo). Así evitas que los hombros se adelanten, como ocurre si apoyas la cabeza en la pared.
Sube con control: un pie en algo con altura detrás te ayuda a subir despacio.
Aguanta el equilibrio usando solo las manos, con la cabeza apoyada en el cajón.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.', 'Place a box (or a chair or sofa) against the wall, at a height where you can rest your head while your hands stay straight underneath.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
It is a normal handstand with your hands on the floor, except your head rests on the box (not on the floor). This stops your shoulders drifting forward, as they do when you rest your head on the wall.
Go up with control: a foot on something raised behind you helps you rise slowly.
Hold the balance using only your hands, with your head resting on the box.
Brace your abs and glutes, legs squeezed together and toes pointed.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared,Cajón'),
('Pino pecho a la pared: piernas a bolita', 'Wall handstand tuck-ups, chest to wall', 'pino', 'repeticiones', 'intermedio', '{"fuerza":70,"equilibrio":40,"resistencia":30}'::jsonb, 'Colócate en pino con el pecho a la pared.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Sube las piernas estiradas y bájalas hacia el pecho, formando una bolita.
La cadera se queda encima de los hombros en todo momento: solo suben y bajan las piernas, de forma aislada, sin mover nada más.', 'Get into a handstand with your chest to the wall.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
Raise your straight legs and bring them towards your chest, forming a tuck.
Your hips stay stacked over your shoulders the whole time: only the legs move, in isolation, with nothing else moving.', 'hombro_delantero:principal,abdominales:principal,triceps:secundario,trapecio:secundario,antebrazo:secundario,cuadriceps:secundario', 'Pared,Paralelas'),
('Pino pecho a la pared: abrir y cerrar piernas', 'Wall handstand leg opens, chest to wall', 'pino', 'repeticiones', 'intermedio', '{"fuerza":60,"equilibrio":40,"movilidad":30,"resistencia":30}'::jsonb, 'Colócate en pino con el pecho a la pared.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Abre y cierra las piernas, manteniendo una retroversión pélvica en todo momento.
Sin mover nada más: solo se mueven las piernas.', 'Get into a handstand with your chest to the wall.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
Open and close your legs, keeping a posterior pelvic tilt at all times.
Nothing else moves: only the legs.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario,abductores:secundario,aductores:secundario', 'Pared,Paralelas'),
('Pino pecho a la pared: de L a attitude', 'Wall handstand L to attitude transition, chest to wall', 'pino', 'repeticiones', 'intermedio', '{"fuerza":65,"equilibrio":50,"resistencia":30}'::jsonb, 'Colócate en pino con el pecho a la pared, en L: una pierna estirada y apoyada en la pared formando 90° con el torso, y la otra pierna recta hacia arriba.
Manos a la anchura de los hombros, con los dedos separados y bien apoyados.
Codos bloqueados, hombros encima de las muñecas y empuje escapular: empuja el suelo para subir los hombros hacia las orejas.
Cabeza entre los hombros y mirada entre las manos.
Activa el abdomen y los glúteos, con las piernas apretadas y los pies en punta.
Dobla la pierna que está en la pared a 90° (empieza ya doblada) y lleva la otra pierna hacia atrás, también a 90°, para pasar a la posición de attitude.
Una pierna se queda pegada a la pared en 90° y la otra pasa hacia atrás en 90°.
Con buena retroversión pélvica, abdomen apretado y sin perder la línea de la cadera con los hombros. No hay que despegarse: solo aguantar y cambiar de forma.', 'Get into a handstand with your chest to the wall, in an L: one straight leg on the wall at 90° to the torso and the other leg straight up.
Hands shoulder-width apart, fingers spread and fully grounded.
Elbows locked, shoulders stacked over the wrists and an active scapular push: push the floor away to lift your shoulders towards your ears.
Head between your shoulders, eyes looking between your hands.
Brace your abs and glutes, legs squeezed together and toes pointed.
Bend the leg on the wall to 90° (it starts already bent) and take the other leg back, also at 90°, to reach the attitude position.
One leg stays on the wall at 90° and the other goes back at 90°.
With a good posterior pelvic tilt, braced abs and keeping your hips in line with your shoulders. You do not take off: just hold and change shape.', 'hombro_delantero:principal,triceps:secundario,trapecio:secundario,abdominales:secundario,antebrazo:secundario,gluteos:secundario', 'Pared,Paralelas'),
('Negativas de flexiones de pica avanzadas', 'Advanced pike push-up negatives', 'empuje', 'repeticiones', 'dificil', '{"fuerza":85,"resistencia":15}'::jsonb, 'Sube los pies a un cajón y coloca las manos en el suelo a la anchura de los hombros.
Cadera alta, brazos estirados y cabeza entre los hombros.
Baja hacia delante, despacio y controlado, hasta llegar a 90° en los codos. Puedes poner bloques de yoga debajo de la cabeza para que te frenen en el tope.
Hacemos solo la fase de bajada (negativa): al terminar, vuelve a la posición inicial como puedas.
Activa abdomen y glúteos, con las piernas apretadas y los pies en punta.', 'Put your feet on a box and place your hands on the floor shoulder-width apart.
Hips high, arms straight and head between your shoulders.
Lower forward slowly and under control until your elbows reach 90°. You can place yoga blocks under your head so they stop you at the end.
Only the lowering phase (negative) is done: afterwards, return to the start position however you can.
Brace abs and glutes, with legs squeezed together and toes pointed.', 'hombro_delantero:principal,triceps:principal,trapecio:secundario,pecho:secundario,abdominales:secundario', 'Cajón,Bloque de yoga'),
('Floor leg raises (elevación de piernas en el suelo)', 'Floor leg raises', 'core', 'repeticiones', 'intermedio', '{"fuerza":60,"resistencia":40}'::jsonb, 'Túmbate boca arriba sobre la esterilla, con las piernas estiradas y los brazos a los lados o las manos bajo la cadera.
Mantén la zona lumbar pegada al suelo, con retroversión pélvica y el abdomen apretado.
Sube las piernas estiradas hasta los 90° y bájalas despacio sin que toquen el suelo.
Sin balanceo y sin arquear la espalda.', 'Lie face up on the mat with your legs straight and your arms by your sides or your hands under your hips.
Keep your lower back pressed to the floor, with a posterior pelvic tilt and braced abs.
Raise your straight legs to 90° and lower them slowly without letting them touch the floor.
No swinging and no arching your back.', 'abdominales:principal,oblicuos:secundario,cuadriceps:secundario', 'Esterilla'),
('Rotación de antebrazo con torso apoyado', 'Forearm rotations with supported torso', 'movilidad', 'repeticiones', 'facil', '{"movilidad":80,"fuerza":20}'::jsonb, 'Ponte en cuadrupedia (a cuatro apoyos).
Apoya el torso sobre una de las manos, y pon la otra mano con la palma contra la palma de la primera, encima.
El brazo que se ha quedado con el dorso de la mano apoyado hace solo rotaciones del antebrazo, desde el codo.
Sin doblar el codo y sin mover la muñeca.', 'Get on all fours.
Rest your torso on one hand, and place the other hand palm to palm on top of it.
The arm whose back of the hand is resting only does forearm rotations, from the elbow.
Do not bend the elbow and do not move the wrist.', 'antebrazo:principal', ''),
('Arranque de dominada en anillas', 'Ring pull-up start (bottom partials)', 'tiron', 'repeticiones', 'intermedio', '{"fuerza":85,"resistencia":15}'::jsonb, 'Agárrate a las anillas, colgado/a con los brazos estirados, sin banda ni ayuda.
Empieza con la escápula activa y tira hacia arriba.
Sube hasta los 90° o hasta donde llegues: son dominadas parciales, solo el arranque.
Baja despacio y controlado hasta la posición de colgado.', 'Grip the rings and hang with straight arms, with no band or help.
Start with an active scapula and pull up.
Pull up to 90° or as far as you can: these are partial pull-ups, only the start of the movement.
Lower slowly and under control to the hanging position.', 'espalda_alta:principal,biceps:principal,antebrazo:secundario,trapecio:secundario,hombro_trasero:secundario,abdominales:secundario', 'Anillas'),
('Dominadas parciales arriba en anillas', 'Top partial ring pull-ups', 'tiron', 'repeticiones', 'intermedio', '{"fuerza":85,"resistencia":15}'::jsonb, 'Sube arriba del todo en las anillas.
Desde arriba, baja hasta los 90° y vuelve a subir.
No bajas del todo: trabajas solo la parte alta del recorrido, con control y los hombros activos.', 'Pull up to the top on the rings.
From the top, lower to 90° and pull back up.
You do not lower all the way: you work only the upper part of the range, with control and active shoulders.', 'espalda_alta:principal,biceps:principal,antebrazo:secundario,trapecio:secundario,hombro_trasero:secundario,abdominales:secundario', 'Anillas'),
('Dominada typewriter en anillas con pies apoyados', 'Foot-supported ring typewriter pull-up', 'tiron', 'repeticiones', 'dificil', '{"fuerza":85,"resistencia":15}'::jsonb, 'Haz una dominada en anillas apoyando los pies en el suelo.
Arriba, desplázate hacia un lado: una mano se estira y la otra se queda en isométrico.
Vuelve al centro y repite hacia el otro lado con la otra mano.
Es como una dominada typewriter, pero en anillas y con los pies apoyados.', 'Do a ring pull-up with your feet resting on the floor.
At the top, shift to one side: one arm straightens while the other stays in an isometric hold.
Return to the centre and repeat to the other side with the other arm.
It is like a typewriter pull-up, but on rings and with your feet supported.', 'espalda_alta:principal,biceps:principal,antebrazo:secundario,trapecio:secundario,hombro_trasero:secundario,abdominales:secundario,oblicuos:secundario', 'Anillas'),
('Dominada en anillas con goma: soltar arriba y negativa', 'Banded ring pull-up, release at the top and negative', 'tiron', 'repeticiones', 'dificil', '{"fuerza":85,"resistencia":15}'::jsonb, 'Sube con una goma (banda elástica) en los pies hasta arriba del todo, en las anillas.
Una vez arriba, suelta la goma de los pies.
Aguanta 2 segundos arriba.
Baja una negativa despacio y controlado.', 'Pull up on the rings with an elastic band on your feet, all the way to the top.
Once at the top, release the band from your feet.
Hold for 2 seconds at the top.
Lower a slow, controlled negative.', 'espalda_alta:principal,biceps:principal,antebrazo:secundario,trapecio:secundario,hombro_trasero:secundario,abdominales:secundario', 'Anillas,Banda elástica'),
('Isométricos de dominada en anillas (3 alturas)', 'Ring pull-up isometrics (3 heights)', 'tiron', 'duracion', 'dificil', '{"fuerza":75,"resistencia":40}'::jsonb, 'Agárrate a las anillas con la escápula activa.
Aguanta isométricos en tres alturas: arriba del todo, a 90° y un poquito más abajo, casi estirado.
Mantén cada altura el tiempo indicado, sin balancearte y con el cuerpo apretado.', 'Grip the rings with an active scapula.
Hold isometrics at three heights: at the very top, at 90° and a little lower, almost straight.
Hold each height for the time indicated, without swinging and with your body tight.', 'espalda_alta:principal,biceps:principal,antebrazo:secundario,trapecio:secundario,hombro_trasero:secundario,abdominales:secundario', 'Anillas')
),
ins as (
  insert into public.ejercicios (nombre, nombre_en, categoria, tipo, dificultad, trabajo, descripcion, descripcion_en)
  select nombre, nombre_en, categoria, tipo, dificultad, trabajo, descripcion, descripcion_en from nuevos
  on conflict do nothing
  returning id, nombre
),
mus as (
  insert into public.ejercicio_musculos (ejercicio_id, musculo, rol)
  select ins.id, split_part(m, ':', 1), split_part(m, ':', 2)
  from ins join nuevos n on n.nombre = ins.nombre, unnest(string_to_array(n.musculos, ',')) as m
  on conflict do nothing
  returning 1
),
mat as (
  insert into public.ejercicio_materiales (ejercicio_id, material_id)
  select ins.id, ma.id
  from ins join nuevos n on n.nombre = ins.nombre, unnest(string_to_array(n.materiales, ',')) as x
  join public.materiales ma on lower(ma.nombre) = lower(x)
  on conflict do nothing
  returning 1
)
select (select count(*) from ins) as creados;

-- Notas en dos ejercicios que ya existían (se añade una línea al final de la explicación).
update public.ejercicios set
  descripcion = descripcion || E'\nVariante muy pegada: acerca las manos a la pared, completamente.',
  descripcion_en = coalesce(descripcion_en, '') || E'\nVery close variation: bring your hands completely close to the wall.'
where nombre = 'Pino de cara a la pared' and descripcion not like '%muy pegada%';

update public.ejercicios set
  descripcion = descripcion || E'\nAñade peso en las manos y en los pies.',
  descripcion_en = coalesce(descripcion_en, '') || E'\nAdd weight in your hands and in your feet.'
where nombre = 'Hollow body con peso en las manos' and descripcion not like '%en los pies%';
