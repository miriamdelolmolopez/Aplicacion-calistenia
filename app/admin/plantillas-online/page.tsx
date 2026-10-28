import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import styles from "../admin.module.css";
import ListaPlantillasOnline, { type FilaPlantilla } from "./ListaPlantillasOnline";

export const metadata = { title: "Plantillas online · Administración" };

type Fila = {
  id: string;
  nombre: string;
  estado: string;
  actualizado_en: string;
  rutina_sesiones: { id: string; rutina_items: { id: string }[] }[];
};

export default async function PlantillasOnline() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("rutinas")
    .select("id, nombre, estado, actualizado_en, rutina_sesiones(id, rutina_items(id))")
    .is("user_id", null)
    .order("actualizado_en", { ascending: false });

  const plantillas: FilaPlantilla[] = ((data ?? []) as unknown as Fila[]).map((r) => {
    const ejercicios = r.rutina_sesiones.reduce((n, s) => n + s.rutina_items.length, 0);
    return {
      id: r.id,
      nombre: r.nombre,
      estado: r.estado,
      resumen: `${r.rutina_sesiones.length} ${r.rutina_sesiones.length === 1 ? "sesión" : "sesiones"} · ${ejercicios} ejercicios · editada ${fechaCorta(r.actualizado_en)}`,
    };
  });

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Plantillas online</h1>
        <Link href="/admin/online" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>Rutinas modelo sin alumno. Cuando creas una rutina para un alumno puedes empezar desde una de estas plantillas.</p>
        <ListaPlantillasOnline plantillas={plantillas} />
      </section>
    </main>
  );
}
