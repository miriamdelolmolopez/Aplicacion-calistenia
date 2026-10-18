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

## Pendiente de decidir
- Cuenta de Supabase y Vercel (las crea Miriam con su correo).
- Nombre definitivo y logo definitivo.
- Migración desde Wodbuster y cuándo se apaga.
- Textos legales (privacidad, términos, cookies).
- WhatsApp: API de pago o seguir con el bot actual.
