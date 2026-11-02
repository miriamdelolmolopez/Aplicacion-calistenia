import Link from "next/link";
import VerComoAlumno from "../../VerComoAlumno";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import BotonFoto from "../../fotos/BotonFoto";
import styles from "../../admin.module.css";
import type { Seccion } from "../Controles";
import { ListaHistoria } from "../ListasAprende";
import CabeceraAdmin from "../../CabeceraAdmin";

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
      <CabeceraAdmin>
        <h1>Historia</h1>
        <VerComoAlumno destino="/aprende/historia" />
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <ListaHistoria
          secciones={secciones}
          siguienteOrden={siguiente}
          fotos={Object.fromEntries(secciones.map((s) => [s.id, <BotonFoto key={s.id} destino="historia" id={s.id} actual={s.foto_url} />]))}
        />
      </section>
    </main>
  );
}
