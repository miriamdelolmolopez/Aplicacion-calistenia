import Link from "next/link";
import VerComoAlumno from "../VerComoAlumno";
import { requireAdmin } from "@/lib/admin";
import { COLUMNAS_CURSO, type Curso } from "@/lib/cursos";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaCursos from "./ListaCursos";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Cursos · Administración" };

export default async function AdministrarAcademia() {
  await requireAdmin("academia");

  const { data } = await createAdminClient().from("cursos").select(COLUMNAS_CURSO).order("creado_en", { ascending: false });
  const cursos = (data ?? []) as Curso[];
  const categorias = [...new Set(cursos.map((c) => c.categoria).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Cursos</h1>
        <VerComoAlumno destino="/academia" />
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <p className={styles.aviso}>
        Aquí creas los cursos. Los <strong>activos</strong> salen en «Cursos actuales», los <strong>próximos</strong> en «Próximos cursos» y los{" "}
        <strong>ocultos</strong> solo los ves tú.
      </p>

      <section className={styles.tarjeta}>
        <ListaCursos cursos={cursos} categorias={categorias} />
      </section>
    </main>
  );
}
