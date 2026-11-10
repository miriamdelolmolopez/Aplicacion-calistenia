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
export type RutinaDoc = { nombre: string; nota: string | null; semanas: number; entrenos_semana: number | null; publicada_en?: string | null };

export type Bloque = { tipo: "titulo" | "meta" | "h1" | "h2" | "texto" | "ejercicio" | "detalle" | "nota" | "enlace"; texto: string; url?: string };

const ZONA = "Europe/Madrid";
const largo = (d: Date) => new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "numeric", month: "long", year: "numeric" }).format(d);

// Líneas de la cabecera sobre fechas: cuándo se publicó y de cuándo a cuándo dura (desde el día que se publica, las semanas que tenga).
export function lineasFechas(rutina: { semanas: number; publicada_en?: string | null }): string[] {
  if (!rutina.publicada_en) return ["Todavía no está publicada"];
  const inicio = new Date(rutina.publicada_en);
  if (Number.isNaN(inicio.getTime())) return [];
  const fin = new Date(inicio.getTime() + (rutina.semanas * 7 - 1) * 86_400_000);
  return [`Publicada el ${largo(inicio)}`, `Desde el ${largo(inicio)} hasta el ${largo(fin)}`];
}

const rango = (min: number | null, max: number | null, unidad: string) => {
  if (min == null && max == null) return "";
  const a = min ?? max;
  return max != null && min != null && max !== min ? `${a}-${max} ${unidad}` : `${a} ${unidad}`;
};

export function bloquesDeRutina(rutina: RutinaDoc, alumna: string, sesiones: SesionDoc[]): Bloque[] {
  const b: Bloque[] = [{ tipo: "titulo", texto: rutina.nombre }];
  if (alumna) b.push({ tipo: "meta", texto: `Alumno/a: ${alumna}` });
  for (const l of lineasFechas(rutina)) b.push({ tipo: "meta", texto: l });
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
      for (const v of i.ejercicios ? videosDe(i.ejercicios) : []) {
        const enlace = analizarVideo(v.url)?.enlace ?? v.url;
        b.push({ tipo: "enlace", texto: `${v.nombre}: ${enlace}`, url: enlace });
      }
    });
  });
  return b;
}
