import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import BotonFoto from "../../fotos/BotonFoto";
import styles from "../../admin.module.css";
import {
  Constructor,
  type CatalogoEjercicio,
  type DatosRutina,
  type SesionRutina,
} from "./Constructor";

export const metadata = { title: "Editar rutina · Administración" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Persona = { nombre: string | null; apellidos: string | null; email: string | null };

type FilaRutina = {
  id: string;
  nombre: string;
  nota: string | null;
  estado: string;
  entrenos_semana: number | null;
  semanas: number;
  foto_url: string | null;
  user_id: string | null;
  profiles: Persona | null;
  rutina_sesiones: (Omit<SesionRutina, "items"> & { rutina_items: SesionRutina["items"] })[];
};

type FilaEjercicio = {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string;
  activo: boolean;
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { materiales: { nombre: string } | null }[];
};

function nombreDe(p: Persona | null) {
  if (!p) return null;
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function EditarRutina({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { data } = await supabase
    .from("rutinas")
    .select(
      "id, nombre, nota, estado, entrenos_semana, semanas, foto_url, user_id, profiles(nombre, apellidos, email), rutina_sesiones(id, nombre, nota, orden, rutina_items(id, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota, grupo))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as unknown as FilaRutina;

  const sesiones: SesionRutina[] = [...r.rutina_sesiones]
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      nota: s.nota,
      orden: s.orden,
      items: [...s.rutina_items]
        .sort((a, b) => a.orden - b.orden)
        .map((i) => ({ ...i, peso_kg: i.peso_kg === null ? null : Number(i.peso_kg) })),
    }));

  const { data: ejerciciosDatos } = await supabase
    .from("ejercicios")
    .select(
      "id, nombre, categoria, tipo, activo, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre))",
    )
    .order("nombre");
  const catalogo: CatalogoEjercicio[] = ((ejerciciosDatos ?? []) as unknown as FilaEjercicio[]).map(
    (e) => ({
      id: e.id,
      nombre: e.nombre,
      categoria: e.categoria,
      tipo: e.tipo,
      activo: e.activo,
      musculos: e.ejercicio_musculos,
      materiales: e.ejercicio_materiales.map((m) => m.materiales?.nombre ?? "").filter(Boolean),
    }),
  );

  const { data: alumnosDatos } = await supabase
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .eq("rol", "alumno")
    .order("nombre");
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string })[]).map((a) => ({
    id: a.id,
    texto: nombreDe(a) ?? "(sin nombre)",
  }));

  const rutina: DatosRutina = {
    id: r.id,
    nombre: r.nombre,
    nota: r.nota,
    estado: r.estado,
    entrenosSemana: r.entrenos_semana,
    semanas: r.semanas,
    esPlantilla: r.user_id === null,
    alumno: nombreDe(r.profiles),
  };

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Editar rutina</h1>
        <Link href="/admin/rutinas" className={styles.enlaceBarra}>
          ← Rutinas
        </Link>
      </header>
      <section className={styles.tarjeta}>
        <h2>Foto de la rutina</h2>
        <p className={styles.ayuda}>La ve la alumna arriba de Mi rutina.</p>
        <BotonFoto destino="rutina" id={r.id} actual={r.foto_url} />
      </section>
      <Constructor rutina={rutina} sesiones={sesiones} catalogo={catalogo} alumnos={alumnos} />
    </main>
  );
}
