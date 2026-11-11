import type { Bloque } from "./rutinaDocumento";

// Un entreno hecho por una alumna, con sus series, y las cuentas que se enseñan (duración, descansos, repeticiones…).
export type SerieEntreno = {
  id: string;
  nombre_ejercicio: string;
  tipo: string;
  orden_ejercicio: number;
  numero: number;
  descanso_seg: number;
  nota_objetivo: string | null;
  obj_reps_min: number | null;
  obj_reps_max: number | null;
  obj_segundos_min: number | null;
  obj_segundos_max: number | null;
  obj_peso_kg: number | null;
  obj_distancia_m: number | null;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  detalle: string | null;
  completada: boolean;
  completada_en: string | null;
  rpe: number | null;
};

export type Entreno = {
  id: string;
  user_id: string;
  nombre_rutina: string;
  nombre_sesion: string;
  estado: string;
  empezado_en: string;
  terminado_en: string | null;
  duracion_seg: number | null;
  entreno_series: SerieEntreno[];
};

export const COLUMNAS_SERIE =
  "id, nombre_ejercicio, tipo, orden_ejercicio, numero, descanso_seg, nota_objetivo, obj_reps_min, obj_reps_max, obj_segundos_min, obj_segundos_max, obj_peso_kg, obj_distancia_m, reps, segundos, peso_kg, distancia_m, detalle, completada, completada_en, rpe";
export const SELECCION_ENTRENO = `id, user_id, nombre_rutina, nombre_sesion, estado, empezado_en, terminado_en, duracion_seg, entreno_series(${COLUMNAS_SERIE})`;

const ZONA = "Europe/Madrid";
export const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function tiempo(seg: number | null | undefined): string {
  if (seg == null) return "—";
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

export const ordenadas = (series: SerieEntreno[]) => [...series].sort((a, b) => a.orden_ejercicio - b.orden_ejercicio || a.numero - b.numero);

const rango = (min: number | null, max: number | null, unidad: string) => {
  if (min == null && max == null) return "";
  const a = min ?? max;
  return max != null && min != null && max !== min ? `${a}-${max} ${unidad}` : `${a} ${unidad}`;
};

export function textoObjetivo(s: SerieEntreno): string {
  return [rango(s.obj_reps_min, s.obj_reps_max, "reps"), rango(s.obj_segundos_min, s.obj_segundos_max, "s"), s.obj_peso_kg ? `${Number(s.obj_peso_kg)} kg` : "", s.obj_distancia_m ? `${s.obj_distancia_m} m` : ""].filter(Boolean).join(" · ") || "—";
}

export function textoHecho(s: SerieEntreno): string {
  return [s.reps != null ? `${s.reps} reps` : "", s.segundos != null ? `${s.segundos} s` : "", s.peso_kg != null ? `${Number(s.peso_kg)} kg` : "", s.distancia_m != null ? `${s.distancia_m} m` : ""].filter(Boolean).join(" · ") || "—";
}

// Tiempo que pasa desde que acaba una serie hasta que acaba la siguiente (incluye el descanso y lo que dura la serie). Solo entre series hechas.
export function tiempoHastaSiguiente(series: SerieEntreno[]): Map<string, number> {
  const hechas = series.filter((s) => s.completada && s.completada_en).sort((a, b) => new Date(a.completada_en as string).getTime() - new Date(b.completada_en as string).getTime());
  const mapa = new Map<string, number>();
  for (let i = 0; i < hechas.length - 1; i++) {
    const t = Math.round((new Date(hechas[i + 1].completada_en as string).getTime() - new Date(hechas[i].completada_en as string).getTime()) / 1000);
    if (t >= 0 && t < 3600) mapa.set(hechas[i].id, t);
  }
  return mapa;
}

export type GrupoEjercicio = { nombre: string; series: SerieEntreno[] };
export function porEjercicio(series: SerieEntreno[]): GrupoEjercicio[] {
  const grupos = new Map<number, GrupoEjercicio>();
  for (const s of ordenadas(series)) {
    const g = grupos.get(s.orden_ejercicio) ?? { nombre: s.nombre_ejercicio, series: [] };
    g.series.push(s);
    grupos.set(s.orden_ejercicio, g);
  }
  return [...grupos.values()];
}

export function totales(e: Entreno) {
  const hechas = e.entreno_series.filter((s) => s.completada);
  return {
    series: e.entreno_series.length,
    hechas: hechas.length,
    reps: hechas.reduce((n, s) => n + (s.reps ?? 0), 0),
    segundos: hechas.reduce((n, s) => n + (s.segundos ?? 0), 0),
    kilos: hechas.reduce((n, s) => n + (s.reps ?? 0) * Number(s.peso_kg ?? 0), 0),
    descansoPautado: e.entreno_series.reduce((n, s) => n + s.descanso_seg, 0),
  };
}

const ESTADOS: Record<string, string> = { terminado: "Terminado", en_curso: "En curso", descartado: "Descartado" };
export const nombreEstado = (e: string) => ESTADOS[e] ?? e;

export function bloquesDeEntreno(e: Entreno, alumna: string): Bloque[] {
  const t = totales(e);
  const b: Bloque[] = [{ tipo: "titulo", texto: e.nombre_sesion }];
  if (alumna) b.push({ tipo: "meta", texto: `Alumno/a: ${alumna}` });
  b.push({ tipo: "meta", texto: `Rutina: ${e.nombre_rutina}` });
  b.push({ tipo: "meta", texto: `Fecha: ${fechaLarga(e.empezado_en)}` });
  b.push({ tipo: "meta", texto: `Duración: ${tiempo(e.duracion_seg)} · Estado: ${nombreEstado(e.estado)}` });
  b.push({ tipo: "meta", texto: `Series hechas: ${t.hechas} de ${t.series} · Repeticiones: ${t.reps}${t.segundos ? ` · Tiempo de trabajo: ${tiempo(t.segundos)}` : ""}${t.kilos ? ` · Carga total: ${Math.round(t.kilos)} kg` : ""}` });
  const pausas = tiempoHastaSiguiente(e.entreno_series);
  porEjercicio(e.entreno_series).forEach((g, i) => {
    b.push({ tipo: "ejercicio", texto: `${i + 1}. ${g.nombre}` });
    for (const s of g.series) {
      const pausa = pausas.get(s.id);
      b.push({
        tipo: "detalle",
        texto: `Serie ${s.numero}: ${s.completada ? textoHecho(s) : "sin hacer"} (objetivo ${textoObjetivo(s)}) · descanso pautado ${s.descanso_seg} s${pausa != null ? ` · hasta la siguiente ${tiempo(pausa)}` : ""}${s.rpe != null ? ` · esfuerzo ${s.rpe}/10` : ""}`,
      });
      if (s.detalle?.trim()) b.push({ tipo: "nota", texto: s.detalle });
    }
  });
  return b;
}

export function filasExcel(e: Entreno, alumna: string): (string | number | null)[][] {
  const t = totales(e);
  const pausas = tiempoHastaSiguiente(e.entreno_series);
  const filas: (string | number | null)[][] = [
    [e.nombre_sesion],
    ["Alumno/a", alumna],
    ["Rutina", e.nombre_rutina],
    ["Fecha", fechaLarga(e.empezado_en)],
    ["Duración", tiempo(e.duracion_seg)],
    ["Estado", nombreEstado(e.estado)],
    ["Series hechas", `${t.hechas} de ${t.series}`],
    ["Repeticiones totales", t.reps],
    [],
    ["Ejercicio", "Serie", "Hecha", "Repeticiones", "Segundos", "Peso (kg)", "Distancia (m)", "Objetivo", "Descanso pautado (s)", "Hasta la siguiente (s)", "Esfuerzo (1-10)", "Nota"],
  ];
  for (const s of ordenadas(e.entreno_series)) {
    filas.push([s.nombre_ejercicio, s.numero, s.completada ? "Sí" : "No", s.reps, s.segundos, s.peso_kg == null ? null : Number(s.peso_kg), s.distancia_m, textoObjetivo(s), s.descanso_seg, pausas.get(s.id) ?? null, s.rpe, s.detalle ?? s.nota_objetivo ?? null]);
  }
  return filas;
}
