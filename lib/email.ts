import "server-only";

// Envío de correos con Resend (https://resend.com). Nunca lanza errores: si algo falla,
// se anota en el registro del servidor y la acción que lo pidió (reservar, cancelar…)
// sigue adelante.
//
// Variables (.env.local):
//   RESEND_API_KEY   clave de Resend (obligatoria para enviar)
//   EMAIL_FROM       por ejemplo "CalisCoach <avisos@miriamdelolmo.com>"
//                    (mientras el dominio no esté verificado: "CalisCoach <onboarding@resend.dev>")
//   EMAIL_REPLY_TO   dónde llegan las respuestas (el Gmail de Miriam)

export type Correo = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
};

export async function enviarCorreo(correo: Correo): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("[email] RESEND_API_KEY no configurada: no se envía «%s»", correo.asunto);
    return false;
  }

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "CalisCoach <onboarding@resend.dev>",
        to: [correo.para],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
    });
    if (!respuesta.ok) {
      console.warn("[email] Resend rechazó «%s»: %s", correo.asunto, await respuesta.text());
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[email] No se pudo enviar «%s»: %s", correo.asunto, String(error));
    return false;
  }
}
