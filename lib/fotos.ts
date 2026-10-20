// Fotos de la app. Las imágenes van en public/fotos. Si un archivo no existe,
// se ve el degradado de color de debajo, así que nunca queda un hueco vacío.

export type FotoNombre = "portada" | "inicio" | "calistenia" | "pino" | "personal" | "online" | "progreso";

const DEGRADADOS: Record<FotoNombre, string> = {
  portada: "linear-gradient(160deg, #b9ad92, #70754b)",
  inicio: "linear-gradient(160deg, #8d9265, #5a5e3b)",
  calistenia: "linear-gradient(160deg, #8d9265, #5a5e3b)",
  pino: "linear-gradient(160deg, #a39a7f, #6a6e47)",
  personal: "linear-gradient(160deg, #6f7351, #3b3d28)",
  online: "linear-gradient(160deg, #565a3d, #2b2b2a)",
  progreso: "linear-gradient(160deg, #7f8556, #4a4d31)",
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
