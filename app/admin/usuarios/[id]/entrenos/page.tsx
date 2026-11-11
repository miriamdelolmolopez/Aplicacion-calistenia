import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../../admin.module.css";
import CabeceraAdmin from "../../../CabeceraAdmin";
import ListaEntrenos, { type FilaEntreno } from "./ListaEntrenos";

export const metadata = { title: "Historial de entrenamientos · Administración" };

type Fila = { id: string; nombre_rutina: string; nombre_sesion: string; estado: string; empezado_en: string; duracion_seg: number | null; entreno_series: { completada: boolean }[] };

export default async function HistorialEntrenos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin("usuarios");
  const admin = createAdminClient();

  const { data: p } = await admin.from("profiles").select("id, nombre, apellidos, email, rol").eq("id", id).maybeSingle();
  if (!p || p.rol === "admin") notFound();
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";

  const { data } = await admin
    .from("entrenos")
    .select("id, nombre_rutina, nombre_sesion, estado, empezado_en, duracion_seg, entreno_series(completada)")
    .eq("user_id", id)
    .order("empezado_en", { ascending: false })
    .limit(1000);
  const filas: FilaEntreno[] = ((data ?? []) as unknown as Fila[]).map((e) => ({
    id: e.id,
    rutina: e.nombre_rutina,
    sesion: e.nombre_sesion,
    estado: e.estado,
    empezado: e.empezado_en,
    duracionSeg: e.duracion_seg,
    series: e.entreno_series.length,
    hechas: e.entreno_series.filter((s) => s.completada).length,
  }));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Historial de entrenamientos</h1>
        <Link href={`/admin/usuarios/${id}`} className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <section className={styles.tarjeta}>
        <strong style={{ fontSize: "1.1rem" }}>{nombre}</strong>
        <div className={styles.ayuda}>
          {filas.length === 0 ? "Todavía no tiene ningún entrenamiento." : `${filas.length} ${filas.length === 1 ? "entrenamiento" : "entrenamientos"} en total.`}
        </div>
      </section>
      <ListaEntrenos userId={id} entrenos={filas} />
    </main>
  );
}
