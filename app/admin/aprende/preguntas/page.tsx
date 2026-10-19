import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import { FormularioPregunta, type Pregunta } from "../Controles";

export const metadata = { title: "Preguntas del examen · Administración" };

export default async function AdministrarPreguntas() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("preguntas")
    .select("id, pregunta_es, pregunta_en, opciones_es, opciones_en, correcta, explicacion_es, explicacion_en, activa, creado_en")
    .order("creado_en", { ascending: false });
  const preguntas = (data ?? []) as Pregunta[];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Preguntas del examen</h1>
        <Link href="/admin/aprende" className={styles.enlaceBarra}>
          ← Aprende
        </Link>
      </header>

      <FormularioPregunta />

      <section className={styles.tarjeta}>
        <h2>Preguntas ({preguntas.length})</h2>
        {preguntas.map((p) => (
          <details key={p.id} className={styles.detalles}>
            <summary>
              {p.pregunta_es}
              {p.activa ? "" : " · oculta"}
            </summary>
            <FormularioPregunta pregunta={p} />
          </details>
        ))}
      </section>
    </main>
  );
}
