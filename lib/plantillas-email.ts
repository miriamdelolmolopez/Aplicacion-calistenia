import "server-only";
import type { Correo } from "./email";

export type Idioma = "es" | "en";

const ZONA = "Europe/Madrid";

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function enlaceApp(ruta: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + ruta;
}

export function fechaHora(iso: string, idioma: Idioma): string {
  const f = new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return f;
}

export function soloFecha(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", {
    timeZone: ZONA,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

// Marco común con la marca: fondo crema, tarjeta blanca, botón verde oliva.
function marco(opts: {
  idioma: Idioma;
  titulo: string;
  parrafos: string[];
  boton?: { texto: string; ruta: string };
}): { html: string; texto: string } {
  const pie =
    opts.idioma === "en"
      ? "You can reply to this email if you have any questions."
      : "Puedes responder a este correo si tienes cualquier duda.";
  const parrafosHtml = opts.parrafos
    .map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;">${p}</p>`)
    .join("");
  const botonHtml = opts.boton
    ? `<p style="margin:22px 0 6px;"><a href="${enlaceApp(opts.boton.ruta)}" style="display:inline-block;padding:12px 22px;background:#70754B;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;">${opts.boton.texto}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F4EFE6;font-family:Arial,Helvetica,sans-serif;color:#2B2B2A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
<tr><td>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#5A5E3B;">Miriam del Olmo</p>
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;">${opts.titulo}</h1>
${parrafosHtml}${botonHtml}
<p style="margin:22px 0 0;font-size:13px;color:#5A5E3B;">${pie}</p>
</td></tr></table></td></tr></table></body></html>`;
  const texto = [opts.titulo, "", ...opts.parrafos.map((p) => p.replace(/<[^>]+>/g, "")), opts.boton ? `${opts.boton.texto}: ${enlaceApp(opts.boton.ruta)}` : ""]
    .join("\n")
    .trim();
  return { html, texto };
}

const abrir = (idioma: Idioma) => (idioma === "en" ? "Open the app" : "Abrir la app");

export type ClaseInfo = { nombre: string; empieza_en: string };

export function correoReserva(p: { para: string; idioma: Idioma; nombrePersona: string; clase: ClaseInfo }): Correo {
  const { idioma, clase } = p;
  const cuando = escapar(fechaHora(clase.empieza_en, idioma));
  const nombre = escapar(p.nombrePersona);
  const titulo = idioma === "en" ? "Your spot is booked" : "Tu plaza está reservada";
  const m = marco({
    idioma,
    titulo,
    parrafos:
      idioma === "en"
        ? [`Hi ${nombre}, you are booked into <strong>${escapar(clase.nombre)}</strong>.`, `<strong>${cuando}</strong>`, "If you cannot make it, cancel from the app in time so someone else can take your spot."]
        : [`Hola ${nombre}, ya tienes plaza en <strong>${escapar(clase.nombre)}</strong>.`, `<strong>${cuando}</strong>`, "Si no puedes venir, cancela desde la app a tiempo para que otra persona pueda coger tu plaza."],
    boton: { texto: abrir(idioma), ruta: "/clases" },
  });
  return { para: p.para, asunto: `${titulo} · ${clase.nombre}`, ...m };
}

export function correoPlazaLiberada(p: { para: string; idioma: Idioma; nombrePersona: string; clase: ClaseInfo; horasPrioridad: number }): Correo {
  const { idioma, clase } = p;
  const cuando = escapar(fechaHora(clase.empieza_en, idioma));
  const nombre = escapar(p.nombrePersona);
  const titulo = idioma === "en" ? "A spot has opened up!" : "¡Se ha liberado una plaza!";
  const m = marco({
    idioma,
    titulo,
    parrafos:
      idioma === "en"
        ? [`Hi ${nombre}, a spot has opened in <strong>${escapar(clase.nombre)}</strong>, which you are waiting for.`, `<strong>${cuando}</strong>`, `People on the waiting list have priority for the first ${p.horasPrioridad} hours. Book it in the app before someone else does.`]
        : [`Hola ${nombre}, se ha liberado una plaza en <strong>${escapar(clase.nombre)}</strong>, que tenías en lista de espera.`, `<strong>${cuando}</strong>`, `Las personas en lista de espera tienen prioridad durante las primeras ${p.horasPrioridad} horas. Resérvala en la app antes de que lo haga otra persona.`],
    boton: { texto: abrir(idioma), ruta: "/clases" },
  });
  return { para: p.para, asunto: `${titulo} · ${clase.nombre}`, ...m };
}

export function correoClaseCancelada(p: {
  para: string;
  idioma: Idioma;
  nombrePersona: string;
  clase: ClaseInfo;
  motivo: string | null;
  devuelta: boolean;
  dias: number;
  enEspera: boolean;
}): Correo {
  const { idioma, clase } = p;
  const cuando = escapar(fechaHora(clase.empieza_en, idioma));
  const nombre = escapar(p.nombrePersona);
  const motivo = p.motivo ? escapar(p.motivo) : null;
  const titulo = idioma === "en" ? "Class cancelled" : "Clase cancelada";
  const parrafos: string[] =
    idioma === "en"
      ? [`Hi ${nombre}, we are sorry: <strong>${escapar(clase.nombre)}</strong> on <strong>${cuando}</strong> has been cancelled.`]
      : [`Hola ${nombre}, lo sentimos: la clase <strong>${escapar(clase.nombre)}</strong> del <strong>${cuando}</strong> se ha cancelado.`];
  if (motivo) parrafos.push(idioma === "en" ? `Reason: ${motivo}` : `Motivo: ${motivo}`);
  if (!p.enEspera && p.devuelta) {
    parrafos.push(idioma === "en" ? "The class has been returned to your pass." : "Te hemos devuelto la clase a tu bono.");
    if (p.dias > 0) {
      parrafos.push(
        idioma === "en"
          ? `We have also extended your pass by ${p.dias} ${p.dias === 1 ? "day" : "days"}.`
          : `Además, hemos ampliado tu bono ${p.dias} ${p.dias === 1 ? "día" : "días"}.`,
      );
    }
  }
  const m = marco({ idioma, titulo, parrafos, boton: { texto: abrir(idioma), ruta: "/clases" } });
  return { para: p.para, asunto: `${titulo} · ${clase.nombre}`, ...m };
}

export function correoBonoCaduca(p: { para: string; idioma: Idioma; nombrePersona: string; nombreBono: string; caduca: string; clasesRestantes: number; esOnline: boolean }): Correo {
  const { idioma } = p;
  const nombre = escapar(p.nombrePersona);
  const fecha = escapar(soloFecha(p.caduca, idioma));
  const titulo = idioma === "en" ? "Your pass is about to expire" : "Tu bono está a punto de caducar";
  const detalleEs = p.esOnline ? "" : ` Te quedan <strong>${p.clasesRestantes}</strong> ${p.clasesRestantes === 1 ? "clase" : "clases"}.`;
  const detalleEn = p.esOnline ? "" : ` You have <strong>${p.clasesRestantes}</strong> ${p.clasesRestantes === 1 ? "class" : "classes"} left.`;
  const m = marco({
    idioma,
    titulo,
    parrafos:
      idioma === "en"
        ? [`Hi ${nombre}, your <strong>${escapar(p.nombreBono)}</strong> expires on <strong>${fecha}</strong>.${detalleEn}`, "To renew it, get in touch with Miriam."]
        : [`Hola ${nombre}, tu <strong>${escapar(p.nombreBono)}</strong> caduca el <strong>${fecha}</strong>.${detalleEs}`, "Para renovarlo, ponte en contacto con Miriam."],
    boton: { texto: abrir(idioma), ruta: "/cuenta" },
  });
  return { para: p.para, asunto: titulo, ...m };
}

// Aviso para Miriam: una persona pide que se borre su cuenta.
export function correoSolicitudBorrado(p: { para: string; nombre: string; correo: string }): Correo {
  const titulo = "Petición de borrado de cuenta";
  const m = marco({
    idioma: "es",
    titulo,
    parrafos: [
      `<strong>${escapar(p.nombre)}</strong> (${escapar(p.correo)}) ha pedido que se borre su cuenta.`,
      "Los pagos se conservan por la contabilidad; se borran sus datos personales. Cuando lo hayas hecho, márcala como atendida en el panel.",
    ],
    boton: { texto: "Ir al panel", ruta: "/admin" },
  });
  return { para: p.para, asunto: titulo, ...m };
}

// Aviso para Miriam (siempre en español).
export function correoMinimoNoAlcanzado(p: { para: string; clase: ClaseInfo; apuntados: number; minimo: number }): Correo {
  const cuando = escapar(fechaHora(p.clase.empieza_en, "es"));
  const titulo = "Una clase no llega al mínimo";
  const m = marco({
    idioma: "es",
    titulo,
    parrafos: [
      `<strong>${escapar(p.clase.nombre)}</strong> · <strong>${cuando}</strong>`,
      `Hay ${p.apuntados} ${p.apuntados === 1 ? "persona apuntada" : "personas apuntadas"} y el mínimo es ${p.minimo}.`,
      "Puedes cancelarla desde el panel si lo ves necesario (se devuelve la clase a todas las apuntadas).",
    ],
    boton: { texto: "Ir al panel de clases", ruta: "/admin/clases" },
  });
  return { para: p.para, asunto: `${titulo} · ${p.clase.nombre}`, ...m };
}

// Invitación a la app: a una persona nueva (invitada) para que cree su cuenta, o a una alumna dada de alta para que elija su contraseña.
export function correoInvitacion(p: { para: string; alumno: boolean; ruta: string }): Correo {
  const titulo = p.alumno ? "Te damos la bienvenida" : "Te invito a mi app";
  const m = marco({
    idioma: "es",
    titulo,
    parrafos: p.alumno
      ? [
          "Miriam del Olmo te ha dado de alta en su app de calistenia y pino. Desde ahí reservas tus clases, ves tu bono y tu progreso.",
          "Pulsa el botón para elegir tu contraseña y entrar. Si no esperabas este correo, puedes ignorarlo.",
        ]
      : [
          "Miriam del Olmo te invita a su app de calistenia y pino. Crea tu cuenta para empezar.",
          "Pulsa el botón para crear tu cuenta. Si no esperabas este correo, puedes ignorarlo.",
        ],
    boton: { texto: p.alumno ? "Elegir mi contraseña" : "Crear mi cuenta", ruta: p.ruta },
  });
  return { para: p.para, asunto: p.alumno ? "Te damos la bienvenida · Miriam del Olmo" : "Te invito a mi app · Miriam del Olmo", ...m };
}
