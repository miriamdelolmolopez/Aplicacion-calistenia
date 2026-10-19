// Cursos de la Academia: tipos y textos comunes a la administración y a las alumnas.
export type Nivel = "iniciacion" | "intermedio" | "avanzado";
export type EstadoCurso = "activo" | "proximo" | "oculto";

export const NIVELES: { valor: Nivel; es: string; en: string }[] = [
  { valor: "iniciacion", es: "Iniciación", en: "Beginner" },
  { valor: "intermedio", es: "Intermedio", en: "Intermediate" },
  { valor: "avanzado", es: "Avanzado", en: "Advanced" },
];

export const ESTADOS_CURSO: { valor: EstadoCurso; es: string }[] = [
  { valor: "activo", es: "Activo (sale en Cursos actuales)" },
  { valor: "proximo", es: "Próximo (sale en Próximos cursos)" },
  { valor: "oculto", es: "Oculto (solo lo ves tú)" },
];

export type Curso = {
  id: string;
  titulo: string;
  titulo_en: string | null;
  descripcion: string | null;
  descripcion_en: string | null;
  categoria: string | null;
  nivel: Nivel;
  precio_centimos: number;
  estado: EstadoCurso;
  enlace: string | null;
  foto_url: string | null;
  popularidad: number;
  valoracion: number | null;
  fecha_prevista: string | null;
  creado_en: string;
};

export const COLUMNAS_CURSO =
  "id, titulo, titulo_en, descripcion, descripcion_en, categoria, nivel, precio_centimos, estado, enlace, foto_url, popularidad, valoracion, fecha_prevista, creado_en";

export function nombreNivel(nivel: string, idioma: "es" | "en"): string {
  const n = NIVELES.find((x) => x.valor === nivel);
  return n ? n[idioma] : nivel;
}

// 0 = gratis; si no, el precio en euros (sin decimales si no los tiene).
export function textoPrecio(centimos: number, idioma: "es" | "en"): string {
  if (centimos <= 0) return idioma === "en" ? "Free" : "Gratis";
  const euros = centimos / 100;
  const n = Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(".", idioma === "en" ? "." : ",");
  return `${n} €`;
}
