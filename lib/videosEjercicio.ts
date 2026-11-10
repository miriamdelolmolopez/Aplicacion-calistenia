// Cada ejercicio puede tener varios vídeos, cada uno con su nombre (por ejemplo «Vídeo corto» o «Explicación»).
export type VideoEjercicio = { nombre: string; url: string };

export const MAX_VIDEOS = 10;

// Lista de vídeos de un ejercicio. Si todavía no tiene la lista nueva, se usa el vídeo único de siempre.
export function videosDe(e: { videos?: unknown; video_url?: string | null }): VideoEjercicio[] {
  const lista: VideoEjercicio[] = [];
  if (Array.isArray(e.videos)) {
    for (const v of e.videos as { nombre?: unknown; url?: unknown }[]) {
      if (v && typeof v.url === "string" && v.url.trim()) lista.push({ nombre: typeof v.nombre === "string" && v.nombre.trim() ? v.nombre.trim() : "Vídeo", url: v.url.trim() });
    }
  }
  if (lista.length === 0 && e.video_url) lista.push({ nombre: "Vídeo", url: e.video_url });
  return lista;
}
