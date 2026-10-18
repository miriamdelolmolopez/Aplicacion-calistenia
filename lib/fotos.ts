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

export function fondoFoto(nombre: FotoNombre, conVelo = true): string {
  const capas = [`url(/fotos/${nombre}.jpg)`, DEGRADADOS[nombre]];
  return conVelo ? [VELO, ...capas].join(", ") : capas.join(", ");
}

// Qué foto lleva cada tipo de clase, según su nombre.
export function fotoDeClase(nombre: string, servicio?: string): FotoNombre {
  const n = nombre.toLowerCase();
  if (servicio === "individual" || n.includes("personal")) return "personal";
  if (n.includes("pino") || n.includes("handstand")) return "pino";
  return "calistenia";
}
