// Datos de la titular y versión de los textos legales.
// Si cambias algún texto legal, cambia VERSION_LEGAL: todas las personas
// tendrán que volver a aceptarlos para seguir usando la app.
export const VERSION_LEGAL = "2026-10-v1";
export const FECHA_LEGAL = "19 de octubre de 2026";

export const TITULAR = {
  nombre: "Miriam del Olmo López de la Isidra",
  nif: "04855355D",
  direccion: "Paseo Marítimo Rey de España 83, 2B, 29640 Fuengirola (Málaga), España",
  email: "miriamcalistenia@gmail.com",
  telefono: "+34 644 184 762",
};

type Aceptacion = { tipo: string; version: string };

// ¿Ha aceptado la persona la política de privacidad y los términos de la versión actual?
export function aceptadoVigente(filas: Aceptacion[] | null | undefined): boolean {
  const vigentes = new Set((filas ?? []).filter((f) => f.version === VERSION_LEGAL).map((f) => f.tipo));
  return vigentes.has("privacidad") && vigentes.has("terminos");
}
