import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { DOCUMENTOS, DOCUMENTOS_CON_ACEPTACION, TITULO_DOCUMENTO } from "@/lib/legalTexto";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";

export const metadata = { title: "Textos legales · Administración" };

export default async function TextosLegales() {
  await requireAdmin();
  const { data } = await createAdminClient().from("textos_legales").select("documento, version, publicado_en").eq("vigente", true);
  const vigentes = new Map(((data ?? []) as { documento: string; version: string; publicado_en: string }[]).map((d) => [d.documento, d]));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Textos legales</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <p className={styles.ayuda}>
        Aquí cambias los textos que ven las alumnas. Las erratas y aclaraciones se guardan sin más. Si cambian las condiciones o los datos que
        recoges, publica una versión nueva de la política de privacidad o de los términos: todas las personas tendrán que aceptarla otra vez.
        Recuerda que tu asesoría debe revisar los cambios importantes.
      </p>

      <section className={styles.tarjeta}>
        {DOCUMENTOS.map((d) => {
          const v = vigentes.get(d);
          return (
            <div key={d} style={{ marginBottom: 14 }}>
              <Link href={`/admin/legal/${d}`} className={styles.boton}>
                {TITULO_DOCUMENTO[d]}
              </Link>
              <p className={styles.ayuda}>
                {v ? `Versión vigente: ${v.version}` : "Sin publicar"}
                {DOCUMENTOS_CON_ACEPTACION.includes(d) ? " · se acepta al registrarse" : " · solo informativo"}
              </p>
            </div>
          );
        })}
      </section>
    </main>
  );
}
