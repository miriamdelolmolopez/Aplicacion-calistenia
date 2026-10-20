import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { COLUMNAS_CURSO, ESTADOS_CURSO, nombreNivel, textoPrecio, type Curso } from "@/lib/cursos";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { FormularioCurso } from "./Controles";

export const metadata = { title: "Academia · Administración" };

export default async function AdministrarAcademia() {
  await requireAdmin();

  const { data } = await createAdminClient().from("cursos").select(COLUMNAS_CURSO).order("creado_en", { ascending: false });
  const cursos = (data ?? []) as Curso[];
  const categorias = [...new Set(cursos.map((c) => c.categoria).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "es"));
  const etiquetaEstado = (e: string) => ESTADOS_CURSO.find((x) => x.valor === e)?.es.split(" (")[0] ?? e;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Academia</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <p className={styles.aviso}>
        Aquí creas los cursos. Los <strong>activos</strong> salen en «Cursos actuales», los <strong>próximos</strong> en «Próximos cursos» y los{" "}
        <strong>ocultos</strong> solo los ves tú.
      </p>

      <FormularioCurso categorias={categorias} />

      <section className={styles.tarjeta}>
        <h2>Tus cursos ({cursos.length})</h2>
        {cursos.length === 0 && <p className={styles.ayuda}>Todavía no hay cursos.</p>}
        {cursos.map((c) => (
          <details key={c.id} className={styles.detalles}>
            <summary>
              {c.titulo} · {etiquetaEstado(c.estado)} · {nombreNivel(c.nivel, "es")} · {textoPrecio(c.precio_centimos, "es")}
            </summary>
            <FormularioCurso curso={c} categorias={categorias} />
          </details>
        ))}
      </section>
    </main>
  );
}
