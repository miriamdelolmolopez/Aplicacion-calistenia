import { analizarVideo } from "@/lib/video";
import { videosDe } from "@/lib/videosEjercicio";

// Datos de una rutina tal y como se imprimen (PDF e imagen). El documento de Word se monta aparte, en la ruta.
type ItemDoc = {
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number;
  nota: string | null;
  ejercicios: { nombre: string; video_url: string | null; videos?: unknown } | null;
};
export type SesionDoc = { orden: number; nombre: string; nota: string | null; rutina_items: ItemDoc[] };
export type RutinaDoc = { nombre: string; nota: string | null; semanas: number; entrenos_semana: number | null };

export type Bloque = { tipo: "titulo" | "meta" | "h1" | "h2" | "texto" | "ejercicio" | "detalle" | "nota" | "enlace"; texto: string };

const rango = (min: number | null, max: number | null, unidad: string) => {
  if (min == null && max == null) return "";
  const a = min ?? max;
  return max != null && min != null && max !== min ? `${a}-${max} ${unidad}` : `${a} ${unidad}`;
};

export function bloquesDeRutina(rutina: RutinaDoc, alumna: string, sesiones: SesionDoc[]): Bloque[] {
  const b: Bloque[] = [{ tipo: "titulo", texto: rutina.nombre }];
  if (alumna) b.push({ tipo: "meta", texto: `Alumno/a: ${alumna}` });
  b.push({ tipo: "meta", texto: `${rutina.semanas} ${rutina.semanas === 1 ? "semana" : "semanas"} · ${rutina.entrenos_semana ?? sesiones.length} entrenos por semana` });
  if (rutina.nota?.trim()) {
    b.push({ tipo: "h2", texto: "Notas" });
    for (const l of rutina.nota.split(/\n+/)) b.push({ tipo: "texto", texto: l });
  }
  sesiones.forEach((s, n) => {
    b.push({ tipo: "h1", texto: `Día ${n + 1}: ${s.nombre}` });
    if (s.nota?.trim()) b.push({ tipo: "nota", texto: s.nota });
    const items = [...s.rutina_items].sort((x, y) => x.orden - y.orden);
    if (items.length === 0) b.push({ tipo: "texto", texto: "Sin ejercicios." });
    items.forEach((i, k) => {
      const medida = [rango(i.reps_min, i.reps_max, "repeticiones"), rango(i.segundos_min, i.segundos_max, "segundos"), i.peso_kg ? `${i.peso_kg} kg` : "", i.distancia_m ? `${i.distancia_m} m` : ""].filter(Boolean).join(" · ");
      b.push({ tipo: "ejercicio", texto: `${k + 1}. ${i.ejercicios?.nombre ?? "Ejercicio"}` });
      b.push({ tipo: "detalle", texto: `${i.series} ${i.series === 1 ? "serie" : "series"}${medida ? ` × ${medida}` : ""} · descanso ${i.descanso_seg} segundos` });
      if (i.nota?.trim()) b.push({ tipo: "nota", texto: `Nota: ${i.nota}` });
      for (const v of i.ejercicios ? videosDe(i.ejercicios) : []) b.push({ tipo: "enlace", texto: `${v.nombre}: ${analizarVideo(v.url)?.enlace ?? v.url}` });
    });
  });
  return b;
}
