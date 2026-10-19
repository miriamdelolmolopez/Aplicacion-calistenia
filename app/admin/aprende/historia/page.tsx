import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import { FormularioSeccion, type Seccion } from "../Controles";

export const metadata = { title: "Historia · Administración" };

export default async function AdministrarHistoria() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("historia")
    .select("id, titulo_es, titulo_en, texto_es, texto_en, orden, activo")
    .order("orden");
  const secciones = (data ?? []) as Seccion[];
  const siguiente = secciones.reduce((m, s) => Math.max(m, s.orden), 0) + 1;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Historia</h1>
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Aprende
        </Link>
      </header>

      <FormularioSeccion siguienteOrden={siguiente} />

      <section className={styles.tarjeta}>
        <h2>Apartados ({secciones.length})</h2>
        {secciones.map((s) => (
          <details key={s.id} className={styles.detalles}>
            <summary>
              {s.orden}. {s.titulo_es}
              {s.activo ? "" : " · oculto"}
            </summary>
            <FormularioSeccion seccion={s} />
          </details>
        ))}
      </section>
    </main>
  );
}
