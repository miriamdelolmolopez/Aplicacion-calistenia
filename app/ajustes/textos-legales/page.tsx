import { redirect } from "next/navigation";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import ListaTextosLegales, { type Aceptacion } from "../../admin/usuarios/[id]/textos-legales/ListaTextosLegales";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mis textos legales" };

const TITULOS: Record<"es" | "en", Record<string, string>> = {
  es: { terminos: "Términos y condiciones", privacidad: "Política de privacidad", imagen: "Uso de la imagen (fotos y vídeos)", "aviso-legal": "Aviso legal", cookies: "Política de cookies" },
  en: { terminos: "Terms and conditions", privacidad: "Privacy policy", imagen: "Use of your image (photos and videos)", "aviso-legal": "Legal notice", cookies: "Cookie policy" },
};

// Los textos legales que la propia persona ha aceptado, con su PDF. Solo ve los suyos.
export default async function MisTextosLegales() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: perfil }, { data: aceptadas }, { data: textos }] = await Promise.all([
    supabase.from("profiles").select("idioma").eq("id", user.id).maybeSingle(),
    supabase.from("consentimientos").select("tipo, version, aceptado_en, concedido").eq("user_id", user.id).order("aceptado_en", { ascending: false }),
    supabase.from("textos_legales").select("documento, version, contenido"),
  ]);
  const idioma: "es" | "en" = perfil?.idioma === "en" ? "en" : "es";
  const contenido = new Map(((textos ?? []) as { documento: string; version: string; contenido: string }[]).map((t) => [`${t.documento}|${t.version}`, t.contenido]));
  const aceptaciones: Aceptacion[] = ((aceptadas ?? []) as { tipo: string; version: string; aceptado_en: string; concedido: boolean | null }[]).map((a) => ({
    clave: `${a.tipo}|${a.version}|${a.aceptado_en}`,
    tipo: a.tipo,
    titulo: TITULOS[idioma][a.tipo] ?? a.tipo,
    version: a.version,
    aceptadoEn: a.aceptado_en,
    noAutorizo: a.tipo === "imagen" && a.concedido === false,
    texto: contenido.get(`${a.tipo}|${a.version}`) ?? null,
  }));

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{idioma === "en" ? "My legal texts" : "Mis textos legales"}</h1>
      <p className={styles.ayuda}>
        {idioma === "en"
          ? "The texts you accepted, with the exact version, day and time. You can download each one as a PDF."
          : "Los textos que has aceptado, con la versión exacta, el día y la hora. Puedes descargar cada uno en PDF."}
      </p>
      <ListaTextosLegales userId={user.id} aceptaciones={aceptaciones} propia idioma={idioma} />
    </main>
  );
}
