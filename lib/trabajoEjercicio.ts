// Qué trabaja cada ejercicio (de 0 a 100) y lo fácil o difícil que es.
export const TRABAJOS = [
  { clave: "fuerza", es: "Fuerza", en: "Strength", color: "#0aa8c0" },
  { clave: "resistencia", es: "Resistencia", en: "Endurance", color: "#6d5efc" },
  { clave: "movilidad", es: "Movilidad", en: "Mobility", color: "#2fb57a" },
  { clave: "equilibrio", es: "Equilibrio", en: "Balance", color: "#f5a524" },
  { clave: "cardio", es: "Cardio", en: "Cardio", color: "#e5484d" },
] as const;

export type ClaveTrabajo = (typeof TRABAJOS)[number]["clave"];
export type Trabajo = Partial<Record<ClaveTrabajo, number>>;

export const DIFICULTADES = [
  { valor: "facil", es: "Fácil", en: "Easy", nivel: 1 },
  { valor: "intermedio", es: "Intermedio", en: "Intermediate", nivel: 2 },
  { valor: "dificil", es: "Difícil", en: "Hard", nivel: 3 },
] as const;

export type Dificultad = (typeof DIFICULTADES)[number]["valor"];
