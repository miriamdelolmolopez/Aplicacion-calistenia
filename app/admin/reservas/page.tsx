import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, sumarDias, textoDia, textoHora } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { TarjetaClase, type ClaseDelDia } from "./Controles";
import estilos from "./reservas.module.css";
import TiraSemana from "./TiraSemana";

export const metadata = { title: "Reservas de clases · Administración" };

type Persona = { nombre: string | null; apellidos: string | null; email: string | null; foto_path: string | null };
type Fila = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  tipos_clase: { nombre: string; color: string | null } | null;
  reservas: { id: string; estado: string; user_id: string; es_prueba: boolean; asistencia: "asistio" | "no_asistio" | null; profiles: Persona | null }[];
};

function nombreDe(p: Persona | null) {
  if (!p) return "(persona borrada)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function Reservas({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { supabase } = await requireAdmin();
  const { dia: diaPedido } = await searchParams;

  const ahoraIso = new Date().toISOString();
  const hoy = claveDia(ahoraIso);
  const dia = diaPedido && /^\d{4}-\d{2}-\d{2}$/.test(diaPedido) ? diaPedido : hoy;
  const desde = instanteMadrid(dia, "00:00")?.toISOString() ?? new Date().toISOString();
  const hasta = instanteMadrid(sumarDias(dia, 1), "00:00")?.toISOString() ?? desde;

  const { data } = await supabase
    .from("sesiones_clase")
    .select(
      "id, empieza_en, plazas, estado, tipos_clase(nombre, color), reservas(id, estado, user_id, es_prueba, asistencia, profiles(nombre, apellidos, email, foto_path))",
    )
    .gte("empieza_en", desde)
    .lt("empieza_en", hasta)
    .order("empieza_en");
  const filas = (data ?? []) as unknown as Fila[];

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = [
    ...new Set(filas.flatMap((c) => c.reservas.filter((r) => r.estado === "reservada").map((r) => r.profiles?.foto_path ?? null))),
  ].filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };
  const fotoDe = (ruta: string | null | undefined) => (ruta ? (firmadas?.find((f) => f.path === ruta)?.signedUrl ?? null) : null);

  const clases: ClaseDelDia[] = filas.map((c) => ({
    id: c.id,
    dia,
    hora: textoHora(c.empieza_en),
    nombre: c.tipos_clase?.nombre ?? "",
    color: colorDeTipo(c.tipos_clase?.color, c.tipos_clase?.nombre ?? ""),
    plazas: c.plazas,
    cancelada: c.estado === "cancelada",
    pasada: new Date(c.empieza_en) <= new Date(ahoraIso),
    personas: c.reservas
      .filter((r) => r.estado === "reservada")
      .map((r) => ({
        reservaId: r.id,
        userId: r.user_id,
        nombre: nombreDe(r.profiles),
        foto: fotoDe(r.profiles?.foto_path),
        prueba: r.es_prueba,
        asistencia: r.asistencia,
      })),
  }));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Reservas</h1>
        <Link href="/admin/horario" className={styles.enlaceBarra}>
          Horario
        </Link>
      </header>

      <TiraSemana dia={dia} hoy={hoy} ruta="/admin/reservas" />
      <p className={styles.ayuda} style={{ margin: "0 0 12px" }}>
        {dia === hoy ? "Hoy" : textoDia(desde)}
        {dia !== hoy && (
          <>
            {" · "}
            <Link href="/admin/reservas" className={styles.enlaceBarra}>
              Ir a hoy
            </Link>
          </>
        )}
      </p>
      <p className={styles.ayuda} style={{ margin: "0 0 12px" }}>
        Pulsa la foto de una persona para ver sus opciones: su perfil, sus reservas (cancelar o borrar, también en clases ya pasadas) y «no se presentó». Si no marcas nada, se entiende que ha venido.
      </p>

      {clases.length === 0 && <p className={estilos.vacio}>No hay clases este día.</p>}
      {clases.map((c) => (
        <TarjetaClase key={c.id} clase={c} />
      ))}
    </main>
  );
}
