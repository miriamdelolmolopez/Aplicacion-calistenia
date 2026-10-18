import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import styles from "../admin.module.css";
import { NuevaRutina } from "./Nueva";

export const metadata = { title: "Rutinas · Administración" };

type Persona = { nombre: string | null; apellidos: string | null; email: string | null };
type Fila = {
  id: string;
  nombre: string;
  estado: string;
  user_id: string | null;
  actualizado_en: string;
  profiles: Persona | null;
  rutina_sesiones: { id: string; rutina_items: { id: string }[] }[];
};

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  publicada: { texto: "Publicada", clase: "estadoPublicada" },
  borrador: { texto: "Borrador", clase: "estadoBorrador" },
  historial: { texto: "Historial", clase: "estadoHistorial" },
};

function nombreDe(p: Persona | null) {
  if (!p) return "(sin alumno)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function Rutinas() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("rutinas")
    .select(
      "id, nombre, estado, user_id, actualizado_en, profiles(nombre, apellidos, email), rutina_sesiones(id, rutina_items(id))",
    )
    .order("actualizado_en", { ascending: false });
  const rutinas = (data ?? []) as unknown as Fila[];

  const { data: alumnosDatos } = await supabase
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .eq("rol", "alumno")
    .order("nombre");
  const { data: planes } = await supabase
    .from("bonos")
    .select("user_id, caduca_en")
    .eq("servicio", "online")
    .eq("estado", "activo");
  const conPlan = new Set((planes ?? []).map((p) => p.user_id));
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string })[]).map((a) => ({
    id: a.id,
    texto: `${nombreDe(a)}${conPlan.has(a.id) ? " · plan online activo" : ""}`,
  }));

  const plantillas = rutinas.filter((r) => r.user_id === null);
  const porAlumno = new Map<string, Fila[]>();
  for (const r of rutinas.filter((r) => r.user_id !== null)) {
    porAlumno.set(r.user_id!, [...(porAlumno.get(r.user_id!) ?? []), r]);
  }

  const resumen = (r: Fila) => {
    const ejercicios = r.rutina_sesiones.reduce((n, s) => n + s.rutina_items.length, 0);
    return `${r.rutina_sesiones.length} ${r.rutina_sesiones.length === 1 ? "sesión" : "sesiones"} · ${ejercicios} ejercicios · editada ${fechaCorta(r.actualizado_en)}`;
  };

  const fila = (r: Fila) => (
    <li key={r.id} className={styles.persona}>
      <div className={styles.personaCabecera}>
        <div>
          <strong>{r.nombre}</strong>
          <div className={styles.ayuda}>{resumen(r)}</div>
        </div>
        <span className={`${styles.estadoChip} ${styles[ESTADOS[r.estado].clase]}`}>
          {ESTADOS[r.estado].texto}
        </span>
      </div>
      <Link href={`/admin/rutinas/${r.id}`} className={`${styles.boton} ${styles.botonSecundario}`}>
        Abrir y editar
      </Link>
    </li>
  );

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Rutinas</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <NuevaRutina
        alumnos={alumnos}
        rutinasBase={rutinas.map((r) => ({
          id: r.id,
          texto: `${r.user_id === null ? "Plantilla" : nombreDe(r.profiles)} · ${r.nombre}`,
        }))}
      />

      <section className={styles.tarjeta}>
        <h2>Plantillas ({plantillas.length})</h2>
        {plantillas.length === 0 && (
          <p className={styles.ayuda}>
            Aún no tienes plantillas. Crea una rutina como «Plantilla» o guarda una rutina de un
            alumno como plantilla desde su pantalla de edición.
          </p>
        )}
        <ul className={styles.lista}>{plantillas.map(fila)}</ul>
      </section>

      <section className={styles.tarjeta}>
        <h2>Rutinas de alumnos ({rutinas.length - plantillas.length})</h2>
        {porAlumno.size === 0 && <p className={styles.ayuda}>Todavía no hay rutinas de alumnos.</p>}
        {[...porAlumno.entries()].map(([id, lista]) => (
          <div key={id}>
            <h3 className={styles.dia}>{nombreDe(lista[0].profiles)}</h3>
            <ul className={styles.lista}>{lista.map(fila)}</ul>
          </div>
        ))}
      </section>
    </main>
  );
}
