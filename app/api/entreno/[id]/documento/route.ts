import { bloquesEnDocx } from "@/lib/bloquesDocx";
import { bloquesDeEntreno, filasExcel, SELECCION_ENTRENO, type Entreno } from "@/lib/entrenoDocumento";
import { rutinaEnImagen } from "@/lib/rutinaImagen";
import { rutinaEnPdf } from "@/lib/rutinaPdf";
import { createClient } from "@/lib/supabase/server";
import { crearXlsx } from "@/lib/xlsx";

const nombreArchivo = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "entreno";

// Descarga un entreno hecho (PDF, Word, Excel o imagen). Lo puede bajar la administradora o la propia alumna online:
// las reglas de acceso de la base de datos deciden quién puede leerlo.
export async function GET(peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return new Response("Necesitas entrar en tu cuenta.", { status: 401 });

  const { data } = await supabase.from("entrenos").select(SELECCION_ENTRENO).eq("id", id).maybeSingle();
  const entreno = data as unknown as Entreno | null;
  if (!entreno) return new Response("No se ha encontrado el entreno.", { status: 404 });

  const { data: perfil } = await supabase.from("profiles").select("nombre, apellidos").eq("id", entreno.user_id).maybeSingle();
  const alumna = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(" ");

  const url = new URL(peticion.url);
  const formato = url.searchParams.get("formato") ?? "pdf";
  const ver = url.searchParams.has("ver");
  const base = `${nombreArchivo(entreno.nombre_sesion)}-${entreno.empezado_en.slice(0, 10)}`;
  const cabeceras = (tipo: string, ext: string) => ({ "Content-Type": tipo, "Content-Disposition": `${ver ? "inline" : "attachment"}; filename="${base}.${ext}"`, "Cache-Control": "private, no-store" });

  const bloques = bloquesDeEntreno(entreno, alumna);
  if (formato === "png") return new Response(await rutinaEnImagen(bloques).arrayBuffer(), { headers: cabeceras("image/png", "png") });
  if (formato === "docx") return new Response(new Uint8Array(await bloquesEnDocx(entreno.nombre_sesion, bloques)), { headers: cabeceras("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx") });
  if (formato === "xlsx") return new Response(new Uint8Array(crearXlsx("Entreno", filasExcel(entreno, alumna), [0, 9])), { headers: cabeceras("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx") });
  return new Response(new Uint8Array(await rutinaEnPdf(entreno.nombre_sesion, bloques)), { headers: cabeceras("application/pdf", "pdf") });
}
