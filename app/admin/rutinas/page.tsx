import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaRutinas, { type FilaCarpeta, type FilaRutina } from "./ListaRutinas";

export const metadata = { title: "Rutinas · Administración" };

type Persona = { nombre: string | null; apellidos: string | null; email: string | null };
type Fila = {
  id: string;
  nombre: string;
  estado: string;
  user_id: string | null;
  carpeta_id?: string | null;
  actualizado_en: string;
  profiles: Persona | null;
  rutina_sesiones: { id: string; rutina_items: { id: string }[] }[];
};

function nombreDe(p: Persona | null) {
  if (!p) return "(sin alumno)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function Rutinas() {
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();

  // Las carpetas necesitan el archivo 044 en Supabase. Si todavía no está, la pantalla funciona igual, sin carpetas.
  const { data: carpetasDatos, error: errorCarpetas } = await admin.from("carpetas_rutinas").select("id, nombre, padre_id").order("nombre");
  const hayCarpetas = !errorCarpetas;
  const carpetas: FilaCarpeta[] = ((carpetasDatos ?? []) as { id: string; nombre: string; padre_id: string | null }[]).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    padreId: c.padre_id,
  }));

  const columnas = "id, nombre, estado, user_id, actualizado_en, profiles(nombre, apellidos, email), rutina_sesiones(id, rutina_items(id))";
  const { data } = await supabase
    .from("rutinas")
    .select(hayCarpetas ? `${columnas}, carpeta_id` : columnas)
    .order("actualizado_en", { ascending: false });
  const todas = (data ?? []) as unknown as Fila[];
  const deAlumnos = todas.filter((r) => r.user_id !== null);

  const { data: alumnosDatos } = await supabase.from("profiles").select("id, nombre, apellidos, email").eq("rol", "alumno").order("nombre");
  const { data: planes } = await supabase.from("bonos").select("user_id").eq("servicio", "online").eq("estado", "activo");
  const conPlan = new Set((planes ?? []).map((p) => p.user_id));
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string })[]).map((a) => ({
    id: a.id,
    texto: `${nombreDe(a)}${conPlan.has(a.id) ? " · plan online activo" : ""}`,
  }));

  const resumen = (r: Fila) => {
    const ejercicios = r.rutina_sesiones.reduce((n, s) => n + s.rutina_items.length, 0);
    return `${r.rutina_sesiones.length} ${r.rutina_sesiones.length === 1 ? "sesión" : "sesiones"} · ${ejercicios} ejercicios · editada ${fechaCorta(r.actualizado_en)}`;
  };
  const filas: FilaRutina[] = deAlumnos.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    alumno: nombreDe(r.profiles),
    estado: r.estado,
    resumen: resumen(r),
    carpetaId: r.carpeta_id ?? null,
  }));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Rutinas</h1>
        <Link href="/admin/online" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>
          Las rutinas de tus alumnos. Las plantillas están en «Plantillas online». Puedes ordenarlas en carpetas y subcarpetas.
          {!hayCarpetas && " (Para usar carpetas falta ejecutar el archivo 044 en Supabase.)"}
        </p>
        <ListaRutinas
          rutinas={filas}
          carpetas={carpetas}
          hayCarpetas={hayCarpetas}
          alumnos={alumnos}
          rutinasBase={todas.map((r) => ({
            id: r.id,
            texto: `${r.user_id === null ? "Plantilla" : nombreDe(r.profiles)} · ${r.nombre}`,
          }))}
        />
      </section>
    </main>
  );
}
