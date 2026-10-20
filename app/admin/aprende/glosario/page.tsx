import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import BotonFoto from "../../fotos/BotonFoto";
import styles from "../../admin.module.css";
import { FormularioTermino, type Termino } from "../Controles";

export const metadata = { title: "Glosario · Administración" };

export default async function AdministrarGlosario() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("glosario")
    .select("id, termino_es, termino_en, definicion_es, definicion_en, activo, foto_url");
  const terminos = ((data ?? []) as (Termino & { foto_url: string | null })[]).sort((a, b) => a.termino_es.localeCompare(b.termino_es, "es"));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Glosario</h1>
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Volver
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
            <BotonFoto destino="glosario" id={t.id} actual={t.foto_url} />
            <FormularioTermino termino={t} />
          </details>
        ))}
      </section>
    </main>
  );
}
