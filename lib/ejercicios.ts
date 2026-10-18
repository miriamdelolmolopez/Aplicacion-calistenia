export const CATEGORIAS = [
  { valor: "pino", es: "Pino", en: "Handstand" },
  { valor: "empuje", es: "Empuje", en: "Push" },
  { valor: "tiron", es: "Tirón", en: "Pull" },
  { valor: "core", es: "Core", en: "Core" },
  { valor: "piernas", es: "Piernas", en: "Legs" },
  { valor: "skills", es: "Skills", en: "Skills" },
  { valor: "movilidad", es: "Movilidad", en: "Mobility" },
  { valor: "otros", es: "Otros", en: "Other" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];

export const nombreCategoria = (valor: string) =>
  CATEGORIAS.find((c) => c.valor === valor)?.es ?? valor;

// Qué se anota en cada serie según el tipo de ejercicio.
export type Campo = "reps" | "segundos" | "peso" | "distancia";

export const TIPOS = [
  { valor: "duracion", es: "Duración", en: "Duration", campos: ["segundos"], peso: null },
  { valor: "repeticiones", es: "Repeticiones (peso corporal)", en: "Reps (bodyweight)", campos: ["reps"], peso: null },
  {
    valor: "peso_corporal_lastre",
    es: "Peso corporal con peso añadido",
    en: "Bodyweight with added weight",
    campos: ["reps", "peso"],
    peso: { es: "Peso añadido (kg)", en: "Added weight (kg)" },
  },
  {
    valor: "repeticiones_peso",
    es: "Repeticiones con peso",
    en: "Weighted reps",
    campos: ["reps", "peso"],
    peso: { es: "Peso (kg)", en: "Weight (kg)" },
  },
  {
    valor: "peso_corporal_asistido",
    es: "Peso corporal asistido",
    en: "Assisted bodyweight",
    campos: ["reps", "peso"],
    peso: { es: "Ayuda (kg o banda)", en: "Assistance (kg or band)" },
  },
  {
    valor: "distancia_duracion",
    es: "Distancia y duración",
    en: "Distance and duration",
    campos: ["distancia", "segundos"],
    peso: null,
  },
  {
    valor: "peso_distancia",
    es: "Peso y distancia",
    en: "Weight and distance",
    campos: ["peso", "distancia"],
    peso: { es: "Peso (kg)", en: "Weight (kg)" },
  },
] as const satisfies readonly {
  valor: string;
  es: string;
  en: string;
  campos: readonly Campo[];
  peso: { es: string; en: string } | null;
}[];

export type Tipo = (typeof TIPOS)[number]["valor"];

export const nombreTipo = (valor: string) => TIPOS.find((t) => t.valor === valor)?.es ?? valor;

// Los 18 grupos musculares. "lib" es el nombre que usa la librería del dibujo del cuerpo.
export const MUSCULOS = [
  { valor: "cuello", es: "Cuello", en: "Neck", lib: "neck" },
  { valor: "trapecio", es: "Trapecio", en: "Trapezius", lib: "trapezius" },
  { valor: "hombro_delantero", es: "Hombro delantero", en: "Front deltoid", lib: "front-deltoids" },
  { valor: "hombro_trasero", es: "Hombro trasero", en: "Rear deltoid", lib: "back-deltoids" },
  { valor: "pecho", es: "Pecho", en: "Chest", lib: "chest" },
  { valor: "biceps", es: "Bíceps", en: "Biceps", lib: "biceps" },
  { valor: "triceps", es: "Tríceps", en: "Triceps", lib: "triceps" },
  { valor: "antebrazo", es: "Antebrazo", en: "Forearm", lib: "forearm" },
  { valor: "espalda_alta", es: "Espalda alta", en: "Upper back", lib: "upper-back" },
  { valor: "espalda_baja", es: "Espalda baja", en: "Lower back", lib: "lower-back" },
  { valor: "abdominales", es: "Abdominales", en: "Abs", lib: "abs" },
  { valor: "oblicuos", es: "Oblicuos", en: "Obliques", lib: "obliques" },
  { valor: "gluteos", es: "Glúteos", en: "Glutes", lib: "gluteal" },
  { valor: "cuadriceps", es: "Cuádriceps", en: "Quadriceps", lib: "quadriceps" },
  { valor: "isquiotibiales", es: "Isquiotibiales", en: "Hamstrings", lib: "hamstring" },
  { valor: "aductores", es: "Aductores", en: "Adductors", lib: "adductor" },
  { valor: "abductores", es: "Abductores", en: "Abductors", lib: "abductors" },
  { valor: "gemelos", es: "Gemelos", en: "Calves", lib: "calves" },
] as const;

export type Musculo = (typeof MUSCULOS)[number]["valor"];
export type RolMusculo = "principal" | "secundario";
export type MusculoDeEjercicio = { musculo: string; rol: string };

export const nombreMusculo = (valor: string) => MUSCULOS.find((m) => m.valor === valor)?.es ?? valor;

// Intensidad (1 a 5) de cada músculo en UN ejercicio: el principal se ve fuerte y el secundario suave.
export function intensidadesDeEjercicio(musculos: MusculoDeEjercicio[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (const m of musculos) resultado[m.musculo] = m.rol === "principal" ? 5 : 2;
  return resultado;
}

// Intensidad (1 a 5) en una sesión o rutina: se suma según las series de cada ejercicio
// (principal pesa 3 y secundario 1) y se reparte entre 1 y 5 respecto al músculo que más trabaja.
export function intensidadesAgregadas(
  items: { series: number; musculos: MusculoDeEjercicio[] }[],
): Record<string, number> {
  const suma: Record<string, number> = {};
  for (const item of items) {
    for (const m of item.musculos) {
      suma[m.musculo] = (suma[m.musculo] ?? 0) + item.series * (m.rol === "principal" ? 3 : 1);
    }
  }
  const maximo = Math.max(0, ...Object.values(suma));
  const resultado: Record<string, number> = {};
  if (maximo === 0) return resultado;
  for (const [musculo, valor] of Object.entries(suma)) {
    resultado[musculo] = Math.max(1, Math.round((5 * valor) / maximo));
  }
  return resultado;
}
