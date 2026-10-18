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

export const MEDIDAS = [
  { valor: "repeticiones", es: "Repeticiones", en: "Reps" },
  { valor: "segundos", es: "Segundos", en: "Seconds" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];
export type Medida = (typeof MEDIDAS)[number]["valor"];

export const nombreCategoria = (valor: string) =>
  CATEGORIAS.find((c) => c.valor === valor)?.es ?? valor;
