# Decisiones del proyecto (Fase 1)

Última actualización: 18 de octubre de 2026.

## General
- **Nombre de la app:** Miriam del Olmo (provisional, se puede cambiar).
- **Plataforma:** web app para móvil y ordenador (PWA instalable).
- **Cuentas:** todas a nombre de Miriam (GitHub, Supabase, Stripe, Vercel).
- **Subdominio:** su suegro hará el ajuste en IONOS para usar un subdominio de miriamdelolmo.com.

## Datos y servicios
- **Base de datos:** Supabase. Gratis mientras se construye; plan Pro (~25 $/mes) al lanzar con alumnos reales (el gratuito se pausa tras 1 semana sin uso y no tiene copias de seguridad).
- **Alojamiento:** Vercel. Para uso de negocio hace falta el plan Pro (~20 $/mes).
- **Correo:** Resend (gratis hasta 3.000 correos/mes).
- **Cobros:** Stripe (comisión por venta) + efectivo/Bizum/transferencia confirmados a mano.
- Coste mensual aproximado al lanzar: ~45 $ + comisiones de Stripe. Precios consultados el 18/10/2026; revisar al contratar.

## Precios (IVA incluido)
**Presencial grupal:** clase suelta 15 € · 4 clases/mes 55 € · 8 clases/mes 80 € · 12 clases/mes 110 € · 10 clases en 3 meses 135 € · clase de prueba gratis.

**Presencial individual:** clase suelta 30 € · 4 sesiones 110 € · 8 sesiones 200 €.

**Online 1:1:** 79 €/mes alumnos actuales · 97 €/mes alumnos nuevos · bimestral 190 € · trimestral 280 € · semestral 540 €.

## Reglas de reservas
- Plazas máximas: calistenia 10, pino 6 (editables).
- Cancelación sin perder la clase: hasta 2 h antes (editable).
- Lista de espera: se avisa a todos a la vez y entra el primero que confirme (sin tiempo de espera).
- Mínimo de alumnos: solo aviso a Miriam; ella decide si se cancela.
- Política de lluvia: el bono se amplía una semana.
- Clase de prueba: una por persona.

## Acceso y registro (Fase 3)
- **Invitado / clase de prueba:** se autorregistra con correo y contraseña. Si luego pasa a alumno de grupales, no se vuelve a registrar: Miriam le cambia el tipo.
- **Alumnos actuales de grupales, individuales presenciales y online:** los da de alta Miriam; reciben una invitación por correo y crean su contraseña.
- **Una misma persona puede tener varios servicios a la vez** (grupal, individual, online).
- **Primer acceso:** obligatorio rellenar datos y aceptar privacidad y términos.
- "Continuar con Google": se deja para el final de la fase o para más adelante.
- **Alta de alumnos:** desde /admin (solo administradora). La app genera un enlace personal que Miriam envía por WhatsApp; el alumno elige contraseña y rellena sus datos. Los enlaces caducan (por defecto 1 hora): se puede generar uno nuevo.
- **Correo propio pendiente:** el correo de serie de Supabase solo sirve para pruebas (no permite editar plantillas en el plan gratuito y solo envía a miembros del equipo). Antes de abrir a alumnos: configurar Resend con el dominio de miriamdelolmo.com y volver a probar registro y recuperación de contraseña; las plantillas están preparadas en supabase/plantillas-correo.md.
- **Panel de administración solo en español.**

## Fase 4 · Reservas y bonos (decisiones)
- **Orden:** A clases y horario · B bonos y pagos a mano · C reservar y cancelar · D lista de espera y clase de prueba.
- **Individuales:** se dejan para después de las grupales.
- **Bono mensual:** dura 30 días desde que se activa; las clases que sobran se pierden. (El bono de 10 clases dura 3 meses.)
- **Descuento de clase:** se descuenta al reservar y se devuelve si cancela a tiempo (hasta 2 h antes, editable). No hace falta marcar asistencia.
- **Reserva:** hasta el momento de empezar la clase si quedan plazas; como máximo con 2 semanas de antelación.
- **Cancelar por lluvia:** un solo botón; la app pregunta cuántos días se amplía el bono a todos los apuntados, cancela la clase y les devuelve su clase.
- **Bonos (Parte B):** clase suelta 15 € y 30 días; mensuales (4/8/12 clases) 30 días; bono de 10 clases 90 días.
- **Bonos seguidos del mismo servicio:** el nuevo empieza a contar cuando se agota el anterior o cuando caduca (lo que ocurra antes). Solo hay un bono activo por persona y servicio; los demás esperan en cola.
- **Reservar con pago pendiente:** permitido en servicios presenciales; el bono se usa desde el principio y el pago pendiente se avisa a Miriam y al alumno. (Para servicios online, más adelante, el bono solo se activará una vez pagado.)
- **Reservas (Parte C):** la clase tiene que caer dentro de la validez del bono activo; si no, la app lo explica. Una reserva por persona y clase.
- **Mínimo de alumnos por clase:** 1 por defecto (solo aviso para Miriam; alerta en las clases de las próximas 24 h que no lleguen).
- **Apuntados visibles para los alumnos:** sí, como nombre e inicial del apellido ("Marta G."). Miriam los ve completos. Hay un interruptor en el panel (ajuste "ver_apuntados") para activarlo o desactivarlo.
- **Ajustes editables en el panel:** horas de cancelación (2), días máximos de antelación (14) y ver apuntados.
- **Cancelar una clase:** un botón que pregunta cuántos días se amplía el bono (0 permitido), cancela la clase y devuelve su clase a todos los apuntados (adelantado desde la Parte D).
- **Lista de espera (Parte D):** sin coste al apuntarse (la clase se descuenta al confirmar). Al liberarse una plaza, todos los de la lista ven "Confirmar plaza" en la app y entra el primero que confirme. Mientras haya lista, solo ellos pueden ocupar la plaza, hasta 2 horas antes de la clase (ajuste "espera_prioridad_horas"); después puede reservar cualquiera.
- **Clase de prueba:** solo clases grupales (columna servicio del tipo de clase). Una por persona; se gasta si va, no se presenta o cancela con menos de 2 h; no se gasta si cancela a tiempo ni si Miriam cancela la clase. Control por DNI (único) y por teléfono (últimos 9 dígitos).
- **Plazas de invitado:** la mitad de las plazas de la clase (redondeando hacia abajo), editable por tipo de clase y por clase. Los invitados no pueden apuntarse a la lista de espera ni reservar sin haber completado sus datos.
- **Avisos:** hasta la Fase 6 el aviso de plaza liberada se ve dentro de la app y el de mínimo no alcanzado como alerta en el panel.
- **Horario inicial (lunes y miércoles):** 17:30 pino intermedio (6 plazas) · 18:35 pino principiantes (6) · 19:40 calistenia (10).

## Fase 5 · Entrenamiento online (decisiones)
- **Orden:** A biblioteca de ejercicios · B constructor de rutinas, plantillas y planes online · C entrenar (series, temporizador) · D progreso (mes, racha, gráficas, objetivos).
- **Vídeos:** la app acepta enlaces de **YouTube** (no listado) y de **Google Drive** (compartido con "cualquiera con el enlace"). Más adelante se puede pasar a Bunny Stream (~1-2 $/mes) si hace falta privacidad real. Quien tenga el enlace puede ver el vídeo.
- **Textos de los ejercicios:** español obligatorio, inglés opcional (si falta, se muestra el español).
- **Rutinas:** sesiones con nombre libre (no atadas a días fijos); cada ejercicio con series, repeticiones o segundos, descanso y nota. El alumno elige qué sesión hace cada día. Se pueden guardar como plantilla y copiar a otro alumno.
- **Acceso:** solo alumnos con plan online activo y pagado (los planes online se añaden al catálogo de bonos: 79 €/97 €/mes, 190 € bimestral, 280 € trimestral, 540 € semestral).
- **Fichas de Drive:** no se importan en esta versión.
- **Fuera de esta fase:** vídeos de corrección subidos por el alumno y chat (se siguen haciendo con Loom y WhatsApp).
- La biblioteca es solo de Miriam; el alumno ve cada ejercicio dentro de su rutina publicada.
- **Acceso e historial:** con el plan online activo, el alumno ve su rutina actual y puede abrir el Historial con las anteriores. Si el plan termina o se da de baja, no ve nada (ni siquiera la rutina de ese mes); si renueva, lo ve todo otra vez.
- **Tipos de ejercicio (7):** duración · repeticiones (peso corporal) · peso corporal con peso añadido · repeticiones con peso · peso corporal asistido · distancia y duración · peso y distancia. Cada tipo decide qué anota el alumno en cada serie y qué objetivos pone Miriam. Sustituyen al campo "medida".
- **Músculos:** 18 grupos (cuello, trapecio, hombro delantero, hombro trasero, pecho, bíceps, tríceps, antebrazo, espalda alta, espalda baja, abdominales, oblicuos, glúteos, cuádriceps, isquiotibiales, aductores, abductores, gemelos). Cada ejercicio tiene músculos principales y secundarios. Mapa del cuerpo en blanco y negro (frente y espalda) con los músculos trabajados en verde oliva; principal = más intenso, secundario = más suave; en una sesión o rutina la intensidad se suma según las series. Librería de dibujo: react-body-highlighter (MIT).
- **Material:** catálogo ampliable (barra de dominadas, paralelas, anillas, banda elástica, lastre, paralettes, banco o cajón, esterilla, pared). Cada ejercicio indica su material y la rutina muestra un resumen de "Material necesario" (por sesión y total).
- **Superseries:** ejercicios consecutivos agrupados (A1, A2…); el descanso va al terminar cada vuelta del grupo.
- **Ordenar en el constructor:** arrastrar y flechas ↑ ↓ (las dos).
- **Una sola rutina publicada por alumno a la vez:** al publicar una nueva, la anterior pasa al historial.
- **Planes online en el catálogo de bonos:** mensual (actuales) 79 €, mensual (nuevos) 97 €, bimestral 190 €, trimestral 280 €, semestral 540 €; solo se activan una vez pagados.
- **B2 · Constructor de rutinas:** rutina = nombre, nota, "entrenos por semana" (vacío = número de sesiones; se usará para la racha), sesiones con nombre libre y ejercicios con series, objetivos según el tipo (repeticiones con rango, segundos, peso, distancia), descanso, nota y superserie. Superserie: ejercicios consecutivos con un solo descanso (el del último del grupo). Ordenar arrastrando o con flechas. Plantillas (rutina sin alumno) y copiar a otro alumno (copia independiente). Se puede editar una rutina publicada: el alumno ve los cambios al momento y lo ya anotado se conserva. El alumno online sin rutina publicada ve "Miriam está preparando tu rutina".
- **Estados de una rutina:** borrador (el alumno no la ve) · publicada (una sola por alumno) · historial (las anteriores; el alumno las ve mientras su plan online esté activo). Al publicar una nueva, la anterior pasa a historial.
- **Acceso del alumno:** solo con plan online activo. Los planes online (bonos de servicio "online") se activan al marcar el pago como cobrado y no cuentan clases.
- **Entrenar (Parte C):** Miriam monta la rutina con toda la información. El alumno pulsa Iniciar (corre un contador de tiempo) y Finalizar. Durante el entreno ve lo pautado (tiempos y repeticiones) y anota lo que hace en cada serie: repeticiones, segundos, peso añadido, banda usada… Al finalizar puede hacer una foto y compartir una imagen con el resumen (tiempo total y músculos trabajados).
- **Entrenar (Parte C) · detalles:** el contador se calcula desde la hora de inicio guardada (sobrevive a cerrar la app). Pantalla encendida durante el entreno. Solo hay un entreno en curso por alumno (continuar o descartar). Se puede entrenar solo una sesión de la rutina **publicada** (la de historial es de solo lectura). Al iniciar se guarda una copia de lo pautado: aunque Miriam edite la rutina, el historial no cambia. Cada serie anota según el tipo (repeticiones, segundos, peso añadido/de ayuda, distancia) más un campo corto de texto para la banda usada u otro detalle; se guarda al instante. Pista "La última vez" por ejercicio. Descanso automático al marcar una serie (en superserie, solo tras la última del grupo), con +/−15 s, saltar, vibración y sonido. Si al finalizar han pasado más de 4 h desde el inicio, se pregunta la duración real. Al finalizar: resumen con tiempo total, series completadas y mapa muscular según lo realmente hecho. Foto: se hace o se elige en el móvil y se genera una imagen para compartir con tiempo, series y mapa; **la foto nunca se sube a la base de datos**. El alumno solo ve sus entrenos mientras su plan online esté activo.
- **Progreso (Parte D):** pantalla "Mi progreso" de la alumna con resumen del mes (entrenos y tiempo), racha, gráficas por ejercicio, historial de entrenos (con cada serie) y objetivos. Miriam ve lo mismo en la ficha de cada alumna.
- **Racha sin fallar:** semanas seguidas (lunes a domingo, hora de Madrid) en las que se han terminado al menos tantos entrenos como los "entrenos por semana" de la rutina publicada (si está vacío, el número de sesiones). Si no se cumple, la racha vuelve a 0. La semana en curso no rompe la racha hasta que termina (si ya se cumple, suma).
- **Objetivos:** los pone solo Miriam desde la ficha de la alumna (ejercicio + dato + meta, p. ej. "pino libre 10 s"). Se consideran logrados cuando la mejor serie hecha de ese ejercicio alcanza la meta. La alumna ve una barra de avance.
- **Avatar "Planta":** crece por niveles según los entrenos terminados (descartados no cuentan): 1 semilla (0) · 2 brote (5) · 3 plantita (15) · 4 arbusto (30) · 5 árbol joven (60) · 6 árbol grande con flores (100). Nunca baja de nivel. Con racha de 2 semanas o más luce hojas brillantes. **Si lleva más de 5 días sin terminar un entreno, la planta empieza a marchitarse** (más de 14 días, muy marchita); con el siguiente entreno se recupera al momento. Una alumna que aún no ha entrenado nunca no se marchita. Sale en Mi progreso, en la ficha para Miriam y en el resumen al terminar un entreno (con aviso al subir de nivel). Dibujo vectorial propio en los colores de la marca.

## Fase 6 · Avisos por email (decisiones)
- **Alcance:** por ahora solo avisos por email. **Stripe se aplaza** (Miriam ya tiene cuenta, pero seguirá dando de alta a mano a las alumnas y cobrando en efectivo, Bizum o transferencia). **Textos legales:** los consulta Miriam con su asesoría.
- **Servicio:** Resend (plan gratuito, 3.000 correos/mes) con el dominio **miriamdelolmo.com** (registrado en IONOS; los registros DNS se añaden en el panel de IONOS). Envío desde `avisos@miriamdelolmo.com`; las respuestas van al Gmail de Miriam. La clave de Resend va solo en `.env.local`.
- **Correos de la app:** confirmación de reserva, plaza liberada en lista de espera, clase cancelada (con días de ampliación del bono), bono o plan a punto de caducar (unos 3 días antes) y aviso a Miriam cuando una clase no llega al mínimo. Español o inglés según el idioma de cada persona, con la marca.
- **Correos de Supabase:** registro y recuperar contraseña pasan a salir por Resend (SMTP propio) para usar el dominio y quitar el límite del correo por defecto.
- **Cuándo se envían:** confirmación de reserva (al reservar o al apuntarla Miriam), plaza liberada (a toda la lista de espera de esa clase cuando alguien cancela o Miriam quita a alguien; la prioridad de las primeras horas sigue como estaba), clase cancelada (a las apuntadas y a la lista de espera, con motivo, devolución y días de ampliación). Bono a punto de caducar (3 días antes) y clase que no llega al mínimo (en las próximas 24 h, aviso a Miriam) los lanza un proceso diario (`/api/cron/avisos`, 7:00-8:00 hora de Madrid en Vercel, protegido con `CRON_SECRET`); cada aviso se registra para no repetirse. Las cuentas @example.com (de prueba) nunca reciben correos.
- **Preferencias:** cada alumna puede desactivar desde su cuenta los avisos no esenciales (los esenciales —plaza liberada, clase cancelada, registro y contraseña— se envían siempre).
- **Después:** notificaciones push y WhatsApp.

## Hoja de ruta tras la primera prueba en el móvil (peticiones de Miriam)
- **Menú y paneles:** menú hamburguesa con panel lateral (Inicio, Reservar clases, Ajustes, Mis pagos, Reto del día, Perfil, Academia, Tutoriales, Mensajes). La página de Inicio es un escaparate con secciones con foto. Las opciones y secciones cambian según lo que tenga cada persona: clases en grupo, individuales, online o invitada (y administradora).
- **Reservar clases:** diseño con tira de días, franjas horarias y tarjetas por clase con las fotos de los apuntados (inspirado en Wodbuster, con la marca propia).
- **Perfil:** foto (con cambio de foto), datos personales y medidas. **Ajustes:** notificaciones y privacidad. **Mis pagos:** historial de pagos.
- **Reto del día:** biblioteca de retos que carga Miriam, cada uno con 3 niveles (principiante, intermedio, avanzado); la app publica uno cada día según la fecha asignada; cada persona marca el suyo y lleva su progreso.
- **Cumpleaños:** se avisa por defecto con una notificación; cada persona puede desactivarlo en Ajustes (privacidad).
- **Muro:** descartado por ahora.
- **Tareas o deberes:** asignados por Miriam, con fecha límite.
- **Descuentos:** códigos que aplica Miriam a mano al dar de alta un bono (no hay canje por parte de la alumna de momento).
- **Herramientas de Miriam:** varias plantillas de horario (editar, duplicar, aplicar a semanas concretas, imprimir en PDF), tipos de tarifa (agrupar entrenamientos y limitar cuántos de cada tipo), formas de pago editables, textos legales editables que hay que aceptar de nuevo, de forma obligatoria, cada vez que cambian. Las tarifas recurrentes llegan con Stripe.
- **Automatizaciones:** cumpleaños, día antes y día después de la clase de prueba, etc.
- **Más ideas aprobadas:** lista de personas que llevan semanas sin venir (para avisarles); retos y logros con medallas («primer pino», «10 entrenos», «racha de 4 semanas»); añadir la clase al calendario del móvil (.ics); sección de tutoriales con las dudas frecuentes; sección de mensajes; Academia (cursos con enlace a otra web).
- **Valoración en Google:** solo para quien viene a clases presenciales en Fuengirola; al terminar una clase se le ofrece un enlace a la ficha de Google de Miriam, sin filtrar solo a quien esté contento (Google lo prohíbe). Para online: testimonio dentro de la app que Miriam puede publicar con permiso.
- **Feedback y vídeos del alumno online:** aconsejado: mensajes dentro de la app ligados a un ejercicio o entreno, con vídeo como enlace (Loom, YouTube no listado, Drive) mientras no haya almacenamiento de vídeo propio; WhatsApp sigue como complemento con un botón en la app. Mensajes entre alumnas: más adelante, con permiso de cada persona, opción de bloquear y denunciar.

## Bloque 2 · Perfil, Ajustes y Mis pagos (decisiones)
- **Perfil** (sustituye a «Mi cuenta»): foto (subir, cambiar, quitar; se recorta cuadrada y se reduce en el móvil), datos personales editables por la persona excepto el **DNI/NIE** (solo Miriam), cambio de contraseña, medidas corporales y sus bonos/plan.
- **Fotos:** privadas (almacenamiento privado con enlaces temporales). Las ven la propia persona, Miriam y **solo las alumnas actuales** en las clases; las **invitadas no ven quién está apuntado**, solo las plazas libres para invitados. Sin foto, círculo con iniciales.
- **Visibilidad por defecto:** nombre, foto y cumpleaños **visibles por defecto**. Cada persona puede cambiarlo en Ajustes (foto y cumpleaños).
- **Medidas** (todas opcionales, con fecha y gráfica; solo las ve la persona y Miriam): peso, altura, cintura, cadera, pecho, brazo, muslo. **Sin % de grasa** (no lo sabrán). Una entrada por día. Con peso y altura se calcula el **IMC** automático con una explicación breve. La categoría del IMC de adultos (OMS) no depende del sexo ni de la edad, así que no se pide el sexo; la edad solo sirve para no dar categoría a menores de 18 (se les indica consultar a su médico). Se avisa de que el IMC no distingue músculo de grasa.
- **Ajustes:** idioma; avisos por email separados por tipo (confirmación de reserva, bono por caducar; los importantes —plaza liberada, clase cancelada— no se pueden apagar); privacidad (foto, cumpleaños); pedir el borrado de la cuenta.
- **Borrar cuenta:** la persona lo **pide** y a Miriam le llega un aviso; lo borra ella. Los pagos se conservan (contabilidad) y los datos personales se borran.
- **Mis pagos:** lista de pagos con fecha, bono, importe, método y estado.
- **Menú:** «Mi cuenta» pasa a «Perfil»; se añaden «Ajustes» y «Mis pagos».

## Bloque 3 · Reservar clases rediseñado (decisiones)
- **Diseño:** cabecera con el día elegido y tira de días (L M X J V S D con número, flechas para pasar de semana, solo los días que permite el ajuste de antelación), botones con las horas del día para saltar a cada clase, y tarjetas por clase con nombre y hora grandes, foto de Miriam como profe, fila de cuadrados con la foto de cada persona apuntada y cuadrados grises para las plazas libres. Sin filtro por tipo de clase.
- **Privacidad:** las **invitadas nunca ven quién está apuntado** (se corrige en la base de datos): solo ven las plazas libres y las libres para invitadas. Las alumnas ven a los apuntados (si el ajuste «ver apuntados» está activo) con su foto si la tienen visible, o sus iniciales; al tocar se ven nombre y inicial del apellido («Ana G.»). Miriam siempre los ve.
- **Calendario:** botón «Añadir al calendario» (archivo .ics) tras reservar y en el menú de cada clase, con la dirección **Paseo Marítimo Rey de España 71, Fuengirola, Málaga**, la hora y la duración del tipo de clase.

## Bloque 4 · Herramientas de Miriam (decisiones)
- **Orden:** 4A plantillas de horario y tipos de clase · 4B descuentos · 4C textos legales con aceptación obligatoria.
- **Fuera de alcance por ahora:** tipos de tarifa con límites por tipo de clase (los bonos siguen con un contador general de clases) y formas de pago editables (de momento Efectivo, Bizum, Transferencia y Tarjeta fijas; no se muestran datos de pago a las alumnas). Se pueden añadir más adelante.
- **Plantillas de horario:** varias plantillas con nombre (p. ej. «Horario normal», «Verano»); se pueden crear, editar (día, hora, tipo y plazas), duplicar, borrar (menos la principal), aplicar a una o varias semanas concretas (de lunes a domingo; solo añade las clases que faltan, nunca toca las existentes ni sus reservas, ni crea clases en el pasado) e imprimir o guardar en PDF. Una plantilla es la **principal** y es la que usa el botón «Crear clases». El horario que había pasa a ser «Horario normal».
- **Tipos de clase:** se pueden crear, renombrar, cambiar duración y desactivar (no se borran).
- **Descuentos (4B):** en % o en euros, con caducidad y máximo de usos opcionales; los aplica Miriam al dar de alta **un bono concreto** (no hay descuento «por defecto» por alumna de momento); el pago guarda precio original, descuento y total. Un descuento no se borra si se ha usado (se desactiva); los usos de pagos anulados no cuentan. La alumna ve en «Mis pagos» el precio, el descuento y el total, pero no el nombre del descuento.
- **Textos legales (4C):** privacidad y términos editables en español e inglés, con versiones y fecha; quien no haya aceptado la versión vigente no puede usar la app hasta aceptar; se guarda quién aceptó qué versión y cuándo. Los definitivos los da la asesoría de Miriam; se empieza con los borradores actuales.

## Usuarios, alumnos individuales y estadísticas (decisiones)
- **Sección Usuarios (Administración):** lista de todas las personas que han pasado por la app (alumnas, invitadas y registradas sin más) con foto, etiquetas de servicio y resumen de una línea; buscador y filtros por tipo. Al pinchar, ficha con: datos (contacto, DNI, nacimiento, emergencia, servicios, alta y última conexión, y las herramientas de editar), clases (bono, reservas próximas, clases del mes, días sin venir, racha de semanas, historial), online (rutina, progreso, objetivos, cada entreno con sus series y **avances por sesión** con ▲/▼ respecto a la vez anterior), medidas, pagos y bonos, y **notas privadas** de Miriam. «Ha venido» se calcula como «tenía reserva, no la canceló y la clase ya pasó» (no hay registro de asistencia real; mejora futura: botón «he llegado»).
- **Alumnos individuales:** reutilizan el sistema de clases: tipo «Entrenamiento personal» con 1 plaza (se crea con las plantillas de horario), la alumna elige sola entre los huecos que publica Miriam; una alumna individual solo ve y reserva sesiones personales y su bono solo se gasta en ellas; mismas reglas de cancelación, avisos, lista de espera y calendario. Cada sesión dura **60 minutos** y los bonos individuales duran **30 días**. Precios indicados por Miriam: sesión suelta 30,04 €, y dos bonos de más sesiones a 110,08 € y 200 € (pendiente confirmar nº de sesiones y precios exactos).
- **Estadísticas e informes (pendiente de plan):** alumnos activos y segmentación por sexo, edad y tipo de alumno; tarifas más contratadas; alumnos más implicados; total de ingresos y comparación por meses y anual. Para segmentar por sexo hará falta un campo opcional de sexo en el perfil.

## Pendiente de decidir
- Cuenta de Supabase y Vercel (las crea Miriam con su correo).
- Nombre definitivo y logo definitivo.
- Migración desde Wodbuster y cuándo se apaga.
- Textos legales (privacidad, términos, cookies).
- WhatsApp: API de pago o seguir con el bot actual.
