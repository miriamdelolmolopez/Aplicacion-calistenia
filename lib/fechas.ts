// Todas las fechas se guardan en UTC y se muestran siempre en hora de Madrid.
const ZONA = "Europe/Madrid";

// Momento (ISO) de hace unas horas: sirve para listar clases "de hoy en adelante".
export function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3600 * 1000).toISOString();
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

export function textoHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
