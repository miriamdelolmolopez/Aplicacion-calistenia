import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import { FormularioTermino, type Termino } from "../Controles";

export const metadata = { title: "Glosario · Administración" };

export default async function AdministrarGlosario() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("glosario")
    .select("id, termino_es, termino_en, definicion_es, definicion_en, activo");
  const terminos = ((data ?? []) as Termino[]).sort((a, b) => a.termino_es.localeCompare(b.termino_es, "es"));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Glosario</h1>
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Aprende
        </Link>
      </header>

      <FormularioTermino />

      <section className={styles.tarjeta}>
        <h2>Términos ({terminos.length})</h2>
        {terminos.map((t) => (
          <details key={t.id} className={styles.detalles}>
            <summary>
              {t.termino_es}
              {t.activo ? "" : " · oculto"}
            </summary>
            <FormularioTermino termino={t} />
          </details>
        ))}
      </section>
    </main>
  );
}
