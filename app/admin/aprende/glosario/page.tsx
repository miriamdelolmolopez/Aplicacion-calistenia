import Link from "next/link";
import VerComoAlumno from "../../VerComoAlumno";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import BotonFoto from "../../fotos/BotonFoto";
import styles from "../../admin.module.css";
import type { Termino } from "../Controles";
import { ListaGlosario } from "../ListasAprende";
import CabeceraAdmin from "../../CabeceraAdmin";

export const metadata = { title: "Glosario · Administración" };

export default async function AdministrarGlosario() {
  await requireAdmin("aprende");
  const { data } = await createAdminClient()
    .from("glosario")
    .select("id, termino_es, termino_en, definicion_es, definicion_en, categoria, activo, foto_url");
  const terminos = ((data ?? []) as (Termino & { foto_url: string | null })[]).sort((a, b) => a.termino_es.localeCompare(b.termino_es, "es"));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Glosario</h1>
        <VerComoAlumno destino="/aprende/glosario" />
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <ListaGlosario
          terminos={terminos}
          fotos={Object.fromEntries(terminos.map((t) => [t.id, <BotonFoto key={t.id} destino="glosario" id={t.id} actual={t.foto_url} />]))}
        />
      </section>
    </main>
  );
}
