import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import styles from "../../admin.module.css";
import {
  Constructor,
  type CatalogoEjercicio,
  type CambioSemana,
  type DatosRutina,
  type ExtraSemana,
  type SesionRutina,
} from "./Constructor";
import CabeceraAdmin from "../../CabeceraAdmin";

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
  foto_url: string | null;
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { materiales: { nombre: string } | null }[];
};

function nombreDe(p: Persona | null) {
  if (!p) return null;
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function EditarRutina({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin("online");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Lo que no depende de lo demás (catálogo de ejercicios, personas y planes) se pide a la vez que la rutina.
  const [{ data }, { data: ejerciciosDatos }, { data: alumnosDatos }, { data: planes }] = await Promise.all([
    supabase
    .from("rutinas")
    .select(
      "id, nombre, nota, estado, entrenos_semana, semanas, foto_url, user_id, profiles(nombre, apellidos, email), rutina_sesiones(id, nombre, nota, foto_url, orden, archivada, rutina_items(id, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota, grupo))",
    )
    .eq("id", id)
    .maybeSingle(),
    supabase
      .from("ejercicios")
      .select("id, nombre, categoria, tipo, activo, foto_url, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre))")
      .order("nombre"),
    supabase.from("profiles").select("id, nombre, apellidos, email, rol").in("rol", ["alumno", "invitado"]).order("nombre"),
    supabase.from("bonos").select("user_id").eq("servicio", "online").eq("estado", "activo"),
  ]);
  if (!data) notFound();
  const r = data as unknown as FilaRutina;

  const sesiones: SesionRutina[] = [...r.rutina_sesiones]
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      nota: s.nota,
      foto_url: s.foto_url ?? null,
      orden: s.orden,
      archivada: s.archivada ?? false,
      items: [...s.rutina_items]
        .sort((a, b) => a.orden - b.orden)
        .map((i) => ({ ...i, peso_kg: i.peso_kg === null ? null : Number(i.peso_kg) })),
    }));

  const idsItems = sesiones.flatMap((s) => s.items.map((i) => i.id));
  const [{ data: cambiosDatos }, { data: extrasDatos }] = await Promise.all([
    idsItems.length
    ? supabase
        .from("rutina_cambios_semana")
        .select("id, item_id, semana, ejercicio_id, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota, quitado")
        .in("item_id", idsItems)
        .order("semana")
    : Promise.resolve({ data: [] }),
    sesiones.length
    ? supabase
        .from("rutina_extras_semana")
        .select("id, sesion_id, semana, ejercicio_id, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota")
        .in("sesion_id", sesiones.map((s) => s.id))
        .order("semana")
    : Promise.resolve({ data: [] }),
  ]);
  const cambios: CambioSemana[] = ((cambiosDatos ?? []) as CambioSemana[]).map((c) => ({ ...c, peso_kg: c.peso_kg === null ? null : Number(c.peso_kg) }));

  const extras: ExtraSemana[] = ((extrasDatos ?? []) as ExtraSemana[]).map((x) => ({ ...x, peso_kg: x.peso_kg === null ? null : Number(x.peso_kg) }));

  const catalogo: CatalogoEjercicio[] = ((ejerciciosDatos ?? []) as unknown as FilaEjercicio[]).map(
    (e) => ({
      id: e.id,
      nombre: e.nombre,
      categoria: e.categoria,
      tipo: e.tipo,
      activo: e.activo,
      foto_url: e.foto_url,
      musculos: e.ejercicio_musculos,
      materiales: e.ejercicio_materiales.map((m) => m.materiales?.nombre ?? "").filter(Boolean),
    }),
  );

  const conPlan = new Set((planes ?? []).map((p) => p.user_id));
  // Los invitados solo salen si tienen una prueba online en marcha.
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string; rol: string })[]).filter((a) => a.rol === "alumno" || conPlan.has(a.id)).map((a) => ({
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
    fotoUrl: r.foto_url,
  };

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Editar rutina</h1>
        <Link href="/admin/rutinas" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <Constructor rutina={rutina} sesiones={sesiones} catalogo={catalogo} alumnos={alumnos} cambios={cambios} extras={extras} />
    </main>
  );
}
