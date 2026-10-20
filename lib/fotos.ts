// Fotos de la app. Las imágenes van en public/fotos. Si un archivo no existe,
// se ve el degradado de color de debajo, así que nunca queda un hueco vacío.

export type FotoNombre = "portada" | "inicio" | "calistenia" | "pino" | "personal" | "online" | "progreso";

// Color liso de cada foto: se ve si la foto no carga y, en tarjetas con color, tiñe la foto (efecto duotono).
const DEGRADADOS: Record<FotoNombre, string> = {
  portada: "linear-gradient(#f0622d, #f0622d)",
  inicio: "linear-gradient(#f0622d, #f0622d)",
  calistenia: "linear-gradient(#f0622d, #f0622d)",
  pino: "linear-gradient(#b8451c, #b8451c)",
  personal: "linear-gradient(#6b5a50, #6b5a50)",
  online: "linear-gradient(#e98a5e, #e98a5e)",
  progreso: "linear-gradient(#f0622d, #f0622d)",
};

// Capa oscura suave para que el texto blanco se lea sobre cualquier foto.
const VELO = "linear-gradient(to top, rgba(30, 30, 28, 0.62), rgba(30, 30, 28, 0.08) 65%)";

// `propia` es la foto que Miriam ha subido; si no hay, se usa la de ejemplo.
export function fondoFoto(nombre: FotoNombre, propia?: string | null, esperando = false): string {
  // Con foto propia no se pide también la de ejemplo (el navegador descarga todas las capas).
  const foto = esperando ? null : propia ? `url("${propia}")` : `url(/fotos/${nombre}-v2.webp)`;
  const capas = [foto, DEGRADADOS[nombre]];
  return [VELO, ...capas.filter(Boolean)].join(", ");
}

// Qué foto lleva cada tipo de clase, según su nombre.
export function fotoDeClase(nombre: string, servicio?: string): FotoNombre {
  const n = nombre.toLowerCase();
  if (servicio === "individual" || n.includes("personal")) return "personal";
  if (n.includes("pino") || n.includes("handstand")) return "pino";
  return "calistenia";
}
