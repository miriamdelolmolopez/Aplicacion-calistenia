// Tiempo estimado de una sesión de rutina, a partir de series, repeticiones o segundos y descansos.

export type ItemTiempo = {
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  descanso_seg: number;
};

const SEGUNDOS_POR_REPETICION = 3;
const SEGUNDOS_SIN_OBJETIVO = 40;

function media(a: number | null, b: number | null): number | null {
  if (a === null) return null;
  return b === null ? a : (a + b) / 2;
}

export function segundosDeItem(i: ItemTiempo): number {
  const seg = media(i.segundos_min, i.segundos_max);
  const reps = media(i.reps_min, i.reps_max);
  const porSerie = seg !== null ? seg : reps !== null ? reps * SEGUNDOS_POR_REPETICION : SEGUNDOS_SIN_OBJETIVO;
  return i.series * (porSerie + i.descanso_seg);
}

// Minutos redondeados de 5 en 5 (mínimo 5).
export function minutosEstimados(items: ItemTiempo[]): number {
  const total = items.reduce((suma, i) => suma + segundosDeItem(i), 0);
  return Math.max(5, Math.round(total / 60 / 5) * 5);
}

// Texto del objetivo de una serie: «20-30 s», «6-8 rep»…
export function textoObjetivo(
  i: Pick<ItemTiempo, "reps_min" | "reps_max" | "segundos_min" | "segundos_max">,
  textoRep: string,
): string {
  const partes: string[] = [];
  if (i.reps_min !== null) partes.push(`${i.reps_max ? `${i.reps_min}-${i.reps_max}` : i.reps_min} ${textoRep}`);
  if (i.segundos_min !== null) partes.push(`${i.segundos_max ? `${i.segundos_min}-${i.segundos_max}` : i.segundos_min} s`);
  return partes.join(" · ");
}
