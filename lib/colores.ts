// Colores de los tipos de clase. Todos son lo bastante oscuros para llevar texto blanco encima.
export const PALETA_CLASES = [
  { color: "#5A5E3B", nombre: "Oliva" },
  { color: "#B5593C", nombre: "Terracota" },
  { color: "#3F6A8A", nombre: "Azul pizarra" },
  { color: "#9A6F1C", nombre: "Mostaza" },
  { color: "#7A4B7A", nombre: "Ciruela" },
  { color: "#2F7F76", nombre: "Verde azulado" },
  { color: "#B8627D", nombre: "Rosa viejo" },
  { color: "#7B5B3E", nombre: "Marrón" },
  { color: "#2B2B2A", nombre: "Carbón" },
];

const FORMATO = /^#[0-9a-f]{6}$/i;

export function colorValido(color: string): boolean {
  return FORMATO.test(color);
}

// Color guardado del tipo; si aún no tiene, uno estable según su nombre.
export function colorDeTipo(color: string | null | undefined, nombre: string): string {
  if (color && FORMATO.test(color)) return color;
  let suma = 0;
  for (const letra of nombre) suma += letra.charCodeAt(0);
  return PALETA_CLASES[suma % 8].color;
}

// Primer color de la paleta que no usa ninguno de los tipos existentes.
export function colorLibre(usados: (string | null)[]): string {
  const en_uso = new Set(usados.filter(Boolean).map((c) => String(c).toLowerCase()));
  return (PALETA_CLASES.slice(0, 8).find((p) => !en_uso.has(p.color.toLowerCase())) ?? PALETA_CLASES[usados.length % 8]).color;
}

// Nombre corto para la casilla del calendario: «Pino intermedio» -> «Pino I.».
export function nombreCorto(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/);
  const recorta = (p: string, n: number) => (p.length > n ? p.slice(0, n - 1) + "." : p);
  if (palabras.length === 1) return recorta(palabras[0], 7);
  return `${recorta(palabras[0], 5)} ${palabras[1].charAt(0).toUpperCase()}.`;
}
