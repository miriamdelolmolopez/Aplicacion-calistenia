// Las clases o días «sueltos» (regalos, favores…) son bonos aparte de la tarifa: su tipo interno se llama «Regalo · servicio».

export const esSuelto = (nombreTipo: string | null | undefined): boolean => !!nombreTipo && nombreTipo.startsWith("Regalo · ");

// Nombre que se enseña: la tarifa tal cual, y las clases sueltas como «Clases sueltas».
export function nombreVisible(nombreTipo: string | null | undefined, idioma: "es" | "en" = "es"): string {
  if (!nombreTipo) return "";
  if (!esSuelto(nombreTipo)) return nombreTipo;
  const servicio = nombreTipo.slice("Regalo · ".length);
  if (servicio === "online") return idioma === "en" ? "Extra online days" : "Días online sueltos";
  return idioma === "en" ? "Extra classes" : "Clases sueltas";
}
