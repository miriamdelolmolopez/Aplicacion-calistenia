import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { DOCUMENTOS, DOCUMENTOS_CON_ACEPTACION, TITULO_DOCUMENTO, type Documento } from "@/lib/legalTexto";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import EditorLegal from "../EditorLegal";

export const metadata = { title: "Texto legal · Administración" };

function fecha(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function EditarLegal({ params }: { params: Promise<{ doc: string }> }) {
  await requireAdmin();
  const { doc } = await params;
  if (!(DOCUMENTOS as readonly string[]).includes(doc)) notFound();
  const documento = doc as Documento;

  const { data } = await createAdminClient()
    .from("textos_legales")
    .select("id, version, contenido, vigente, publicado_en")
    .eq("documento", documento)
    .order("publicado_en", { ascending: false });
  const versiones = (data ?? []) as { id: string; version: string; contenido: string; vigente: boolean; publicado_en: string }[];
  const vigente = versiones.find((v) => v.vigente);

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>{TITULO_DOCUMENTO[documento]}</h1>
        <Link href="/admin/legal" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <p className={styles.ayuda}>
        Versión vigente: <strong>{vigente?.version ?? "ninguna"}</strong>
        {vigente && ` · publicada el ${fecha(vigente.publicado_en)}`}.{" "}
        <Link href={`/legal/${documento}`} target="_blank">
          Ver la página pública
        </Link>
      </p>

      <EditorLegal key={vigente?.id ?? "nuevo"} documento={documento} inicial={vigente?.contenido ?? ""} pideAceptacion={DOCUMENTOS_CON_ACEPTACION.includes(documento)} />

      <section className={styles.tarjeta}>
        <h2>Versiones anteriores ({Math.max(versiones.length - 1, 0)})</h2>
        {versiones.filter((v) => !v.vigente).length === 0 && <p className={styles.ayuda}>Todavía no hay versiones anteriores.</p>}
        {versiones
          .filter((v) => !v.vigente)
          .map((v) => (
            <details key={v.id} className={styles.detalles}>
              <summary>
                {v.version} · {fecha(v.publicado_en)}
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{v.contenido}</pre>
            </details>
          ))}
      </section>
    </main>
  );
}
