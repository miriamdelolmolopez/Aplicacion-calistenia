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
- **Avisos:** hasta la Fase 6 el aviso de plaza liberada se ve dentro de la app y el de mínimo no alcanzado como alerta en el panel.
- **Horario inicial (lunes y miércoles):** 17:30 pino intermedio (6 plazas) · 18:35 pino principiantes (6) · 19:40 calistenia (10).

## Pendiente de decidir
- Cuenta de Supabase y Vercel (las crea Miriam con su correo).
- Nombre definitivo y logo definitivo.
- Migración desde Wodbuster y cuándo se apaga.
- Textos legales (privacidad, términos, cookies).
- WhatsApp: API de pago o seguir con el bot actual.
