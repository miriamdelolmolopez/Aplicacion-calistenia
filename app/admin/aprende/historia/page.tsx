import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import BotonFoto from "../../fotos/BotonFoto";
import styles from "../../admin.module.css";
import { FormularioSeccion, type Seccion } from "../Controles";

export const metadata = { title: "Historia · Administración" };

export default async function AdministrarHistoria() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("historia")
    .select("id, titulo_es, titulo_en, texto_es, texto_en, orden, activo, foto_url")
    .order("orden");
  const secciones = (data ?? []) as (Seccion & { foto_url: string | null })[];
  const siguiente = secciones.reduce((m, s) => Math.max(m, s.orden), 0) + 1;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Historia</h1>
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Volver
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
            <BotonFoto destino="historia" id={s.id} actual={s.foto_url} />
            <FormularioSeccion seccion={s} />
          </details>
        ))}
      </section>
    </main>
  );
}
