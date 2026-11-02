import { textoDia, textoHora } from "./fechas";

export type DatosTaller = {
  nombre: string;
  empieza_en: string;
  duracion_min: number;
  modalidad: "presencial" | "online";
  ubicacion: string | null;
  enlace: string | null;
};

// AAAAMMDDTHHMMSSZ, que es lo que pide Google Calendar.
const formatoGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function horaFin(t: DatosTaller): string {
  return textoHora(new Date(new Date(t.empieza_en).getTime() + t.duracion_min * 60000).toISOString());
}

// Texto con los datos del taller, listo para copiar o mandar por WhatsApp o correo.
export function textoDatosTaller(t: DatosTaller): string {
  const lineas = [t.nombre, `${textoDia(t.empieza_en)} · ${textoHora(t.empieza_en)} – ${horaFin(t)}`];
  if (t.modalidad === "online") lineas.push("Online" + (t.enlace ? `: ${t.enlace}` : ""));
  else lineas.push(`Lugar: ${t.ubicacion || "por confirmar"}`);
  if (t.modalidad === "presencial" && t.enlace) lineas.push(t.enlace);
  return lineas.join("\n");
}

// Enlace para añadir el taller al calendario de Google con un clic.
export function enlaceGoogleCalendar(t: DatosTaller): string {
  const ini = new Date(t.empieza_en);
  const fin = new Date(ini.getTime() + t.duracion_min * 60000);
  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: t.nombre,
    dates: `${formatoGoogle(ini)}/${formatoGoogle(fin)}`,
    details: t.modalidad === "online" && t.enlace ? `Enlace: ${t.enlace}` : "",
    location: t.modalidad === "online" ? t.enlace ?? "Online" : t.ubicacion ?? "",
  });
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}
