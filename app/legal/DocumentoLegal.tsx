import { analizarTexto, TITULO_DOCUMENTO, type Documento } from "@/lib/legalTexto";
import { createAdminClient } from "@/lib/supabase/admin";
import PaginaLegal from "./PaginaLegal";

export const dynamic = "force-dynamic";

// Muestra la versión vigente de un texto legal, tal y como está guardada en la base de datos.
export default async function DocumentoLegal({ documento }: { documento: Documento }) {
  const { data } = await createAdminClient()
    .from("textos_legales")
    .select("version, contenido, publicado_en")
    .eq("documento", documento)
    .eq("vigente", true)
    .maybeSingle();

  if (!data) {
    return <PaginaLegal titulo={TITULO_DOCUMENTO[documento]} secciones={[{ titulo: "Texto no disponible", bloques: [{ p: "Este texto todavía no está publicado." }] }]} />;
  }

  const { intro, secciones } = analizarTexto(data.contenido as string);
  const fecha = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(data.publicado_en as string),
  );
  return <PaginaLegal titulo={TITULO_DOCUMENTO[documento]} version={data.version as string} fecha={fecha} intro={intro} secciones={secciones} />;
}
