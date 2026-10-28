// Archivo .ics: lo abren Google Calendar, el calendario del iPhone y el de Android.
export const LUGAR_CLASES = "Paseo Marítimo Rey de España 71, Fuengirola, Málaga";

const fechaIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapar = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function crearIcs(c: { id: string; titulo: string; inicioIso: string; duracionMin: number; descripcion?: string }): string {
  const inicio = new Date(c.inicioIso);
  const fin = new Date(inicio.getTime() + c.duracionMin * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CalisCoach//Clases//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${c.id}@miriamdelolmo`,
    `DTSTAMP:${fechaIcs(new Date())}`,
    `DTSTART:${fechaIcs(inicio)}`,
    `DTEND:${fechaIcs(fin)}`,
    `SUMMARY:${escapar(c.titulo)}`,
    `LOCATION:${escapar(LUGAR_CLASES)}`,
    ...(c.descripcion ? [`DESCRIPTION:${escapar(c.descripcion)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(c.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Fecha en el formato de Google Calendar: AAAAMMDDTHHMMSSZ.
const fechaGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Enlace que abre Google Calendar con la clase ya rellenada.
export function enlaceGoogleCalendar(c: Parameters<typeof crearIcs>[0]): string {
  const inicio = new Date(c.inicioIso);
  const fin = new Date(inicio.getTime() + c.duracionMin * 60000);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: c.titulo,
    dates: `${fechaGoogle(inicio)}/${fechaGoogle(fin)}`,
    details: c.descripcion ?? "",
    location: LUGAR_CLASES,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// Descarga el archivo en el móvil o el ordenador.
export function descargarIcs(c: Parameters<typeof crearIcs>[0]) {
  const blob = new Blob([crearIcs(c)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clase.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
