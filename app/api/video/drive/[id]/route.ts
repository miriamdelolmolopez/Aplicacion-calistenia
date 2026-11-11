import { createClient } from "@/lib/supabase/server";

// Reproduce un vídeo de Google Drive (público) con el reproductor normal del móvil, sin los controles de Drive.
// Drive no lo sirve con el tipo de archivo correcto, y algunos móviles (iPhone) lo rechazan; aquí se pasa tal cual pero con su tipo de vídeo
// y respetando los saltos de la barra de reproducción (Range). Solo para quien ha iniciado sesión.
const ID = /^[\w-]{10,}$/;

export async function GET(peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return new Response("No válido", { status: 400 });
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return new Response("Necesitas entrar en tu cuenta.", { status: 401 });

  const cabeceras: Record<string, string> = {};
  const rango = peticion.headers.get("range");
  if (rango) cabeceras.Range = rango;
  const origen = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { headers: cabeceras, redirect: "follow", cache: "no-store" });
  if (!origen.ok && origen.status !== 206) return new Response("No se ha podido abrir el vídeo.", { status: 502 });
  const tipo = origen.headers.get("content-type") ?? "";
  // Si Drive devuelve una página en vez del vídeo (por ejemplo, por exceso de descargas), se avisa para que la app use el reproductor de Drive.
  if (tipo.startsWith("text/html")) return new Response("Drive no deja descargar este vídeo ahora.", { status: 502 });

  const salida = new Headers({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
  for (const h of ["content-length", "content-range"]) {
    const v = origen.headers.get(h);
    if (v) salida.set(h, v);
  }
  return new Response(origen.body, { status: origen.status, headers: salida });
}
