// Todas las fechas se guardan en UTC y se muestran siempre en hora de Madrid.
const ZONA = "Europe/Madrid";

// Momento (ISO) de hace unas horas: sirve para listar clases "de hoy en adelante".
export function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3600 * 1000).toISOString();
}

// ¿Empieza dentro de las próximas X horas (y todavía no ha empezado)?
export function dentroDeHoras(iso: string, horas: number): boolean {
  const falta = new Date(iso).getTime() - Date.now();
  return falta > 0 && falta <= horas * 3600 * 1000;
}

export function claveDia(iso: string): string {
  // Devuelve AAAA-MM-DD en hora de Madrid (sirve para agrupar clases por día).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function textoDia(iso: string, idioma: "es" | "en" = "es"): string {
  const texto = new Intl.DateTimeFormat(idioma === "es" ? "es-ES" : "en-GB", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Fecha corta, por ejemplo "19 oct 2026".
export function fechaCorta(iso: string, idioma: "es" | "en" = "es"): string {
  return new Intl.DateTimeFormat(idioma === "es" ? "es-ES" : "en-GB", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function textoHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// Fecha AAAA-MM-DD sumándole días (solo calendario, sin horas).
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Lunes de la semana de una fecha AAAA-MM-DD.
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return sumarDias(fecha, -dia);
}

// Instante (UTC) que corresponde a una fecha y hora escritas en hora de Madrid. null si no es válida.
export function instanteMadrid(fecha: string, hora: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  for (const desfase of [1, 2]) {
    const candidato = new Date(Date.UTC(a, m - 1, d, h - desfase, mi));
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(candidato);
    const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
    const hh = v("hour") === "24" ? "00" : v("hour");
    if (`${v("year")}-${v("month")}-${v("day")}` === fecha && `${hh}:${v("minute")}` === hora) return candidato;
  }
  return null;
}
