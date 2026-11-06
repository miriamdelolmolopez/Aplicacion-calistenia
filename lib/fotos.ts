// Fotos de la app. Las imágenes van en public/fotos. Si un archivo no existe,
// se ve el degradado de color de debajo, así que nunca queda un hueco vacío.

import type { CSSProperties } from "react";

export type FotoNombre = "portada" | "inicio" | "calistenia" | "pino" | "personal" | "online" | "progreso";

// Color liso de cada foto: se ve si la foto no carga y, en tarjetas con color, tiñe la foto.
// El tono naranja está al 20 %: es un gris medio (que no cambia la foto) mezclado con un 20 % de naranja.
const DEGRADADOS: Record<FotoNombre, string> = {
  portada: "linear-gradient(#967a6f, #967a6f)",
  inicio: "linear-gradient(#967a6f, #967a6f)",
  calistenia: "linear-gradient(#967a6f, #967a6f)",
  pino: "linear-gradient(#8b746c, #8b746c)",
  personal: "linear-gradient(#7c7876, #7c7876)",
  online: "linear-gradient(#958279, #958279)",
  progreso: "linear-gradient(#967a6f, #967a6f)",
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

// El encuadre de una foto de tarjeta se guarda al final de su dirección: «…jpg#e=30,70» (posición en % de ancho y alto).
const ENCUADRE = /#e=(\d{1,3}),(\d{1,3})$/;

export function sinEncuadre(url: string): string {
  return url.replace(ENCUADRE, "");
}

export function encuadreDeFoto(url?: string | null): { x: number; y: number } {
  const m = url?.match(ENCUADRE);
  return m ? { x: Math.min(100, Number(m[1])), y: Math.min(100, Number(m[2])) } : { x: 50, y: 50 };
}

export function conEncuadre(url: string, x: number, y: number): string {
  const base = sinEncuadre(url);
  return x === 50 && y === 50 ? base : `${base}#e=${Math.round(x)},${Math.round(y)}`;
}

// Foto que rellena su caja (sin bordes) y se ve por la parte encuadrada: para ejercicios, sesiones y rutinas.
export function fotoEncajada(url: string): CSSProperties {
  const e = encuadreDeFoto(url);
  return { backgroundImage: `url("${sinEncuadre(url)}")`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: `${e.x}% ${e.y}%` };
}

// Fondo de una tarjeta con su foto propia ya encuadrada (si se ha encuadrado).
export function estiloFoto(nombre: FotoNombre, propia?: string | null, esperando = false): CSSProperties {
  const e = encuadreDeFoto(propia);
  return {
    backgroundImage: fondoFoto(nombre, propia, esperando),
    ...(propia && ENCUADRE.test(propia) ? { backgroundPosition: `center, ${e.x}% ${e.y}%, center` } : {}),
  };
}

// Qué foto lleva cada tipo de clase, según su nombre.
export function fotoDeClase(nombre: string, servicio?: string): FotoNombre {
  const n = nombre.toLowerCase();
  if (servicio === "individual" || n.includes("personal")) return "personal";
  if (n.includes("pino") || n.includes("handstand")) return "pino";
  return "calistenia";
}
