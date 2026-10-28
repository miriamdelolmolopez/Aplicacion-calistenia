import { Fragment } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, lunesDe, sumarDias, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import AnadirClaseGeneral from "./AnadirClaseGeneral";
import { AplicarPlantilla, CalendarioSemana, type TipoOpcion } from "./Controles";
import { IconoArena, IconoProhibido, IconoUsuario } from "./iconos";
import TarjetaClase from "./TarjetaClase";
import estilos from "./horario.module.css";

export const metadata = { title: "Horarios presenciales · Administración" };

type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  plazas_prueba: number;
  estado: string;
  motivo_cancelacion: string | null;
  tipo_id: string;
  tipos_clase: {
    nombre: string;
    color: string | null;
    servicio: string;
    cancelacion_horas: number | null;
    reserva_dias_max: number | null;
  } | null;
  reservas: { id: string; estado: string }[];
};

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export default async function Horario({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { supabase } = await requireAdmin();
  const { semana } = await searchParams;

  const hoy = claveDia(new Date().toISOString());
  const base = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : hoy;
  const lunes = lunesDe(base);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  const desde = instanteMadrid(lunes, "00:00")?.toISOString() ?? new Date().toISOString();
  const hasta = instanteMadrid(sumarDias(lunes, 7), "00:00")?.toISOString() ?? desde;

  const [{ data: clasesDatos }, { data: tiposDatos }, { data: plantillasDatos }, { data: ajustesDatos }, { data: fechasDatos }] = await Promise.all([
    supabase
      .from("sesiones_clase")
      .select(
        "id, empieza_en, plazas, plazas_prueba, estado, tipo_id, tipos_clase(nombre, color, servicio, cancelacion_horas, reserva_dias_max), reservas(id, estado)",
      )
      .gte("empieza_en", desde)
      .lt("empieza_en", hasta)
      .order("empieza_en"),
    supabase.from("tipos_clase").select("id, nombre, plazas_max, plazas_prueba").eq("activo", true).order("orden").order("nombre"),
    supabase.from("plantillas_horario").select("id, nombre, principal").order("principal", { ascending: false }).order("nombre"),
    supabase.from("ajustes").select("clave, valor"),
    // Días con clases (unos meses antes y después) para marcarlos en los calendarios.
    supabase
      .from("sesiones_clase")
      .select("empieza_en")
      .eq("estado", "programada")
      .gte("empieza_en", instanteMadrid(sumarDias(lunes, -62), "00:00")?.toISOString() ?? desde)
      .lt("empieza_en", instanteMadrid(sumarDias(lunes, 190), "00:00")?.toISOString() ?? hasta)
      .limit(2000),
  ]);
  const marcados: Record<string, number> = {};
  for (const f of (fechasDatos ?? []) as { empieza_en: string }[]) {
    const d = claveDia(f.empieza_en);
    marcados[d] = (marcados[d] ?? 0) + 1;
  }
  const clases = (clasesDatos ?? []) as unknown as Clase[];
  const tipos = (tiposDatos ?? []) as TipoOpcion[];
  const plantillas = (plantillasDatos ?? []) as { id: string; nombre: string; principal: boolean }[];
  const ajuste = (clave: string, defecto: number) => {
    const v = Number(ajustesDatos?.find((a) => a.clave === clave)?.valor);
    return Number.isFinite(v) ? v : defecto;
  };

  const porDia = new Map<string, Clase[]>();
  for (const c of clases) {
    const d = claveDia(c.empieza_en);
    porDia.set(d, [...(porDia.get(d) ?? []), c]);
  }

  const anterior = sumarDias(lunes, -7);
  const siguiente = sumarDias(lunes, 7);
  const [, m1, d1] = lunes.split("-").map(Number);
  const [, m2, d2] = dias[6].split("-").map(Number);

  // Filas de la rejilla: una por cada hora a la que hay clases esta semana.
  const horas = [...new Set(clases.map((c) => textoHora(c.empieza_en)))].sort();

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Horarios presenciales</h1>
        <Link href="/admin/horarios" className={styles.enlaceBarra}>
          Plantillas
        </Link>
      </header>

      <AnadirClaseGeneral fecha={base < hoy ? hoy : base} tipos={tipos} />

      <nav className={estilos.navegacion} aria-label="Cambiar de semana">
        <Link href={`/admin/horario?semana=${anterior}`}>← Anterior</Link>
        <h2 className={estilos.titulo}>
          {d1}/{m1} – {d2}/{m2}
        </h2>
        <Link href={`/admin/horario?semana=${siguiente}`}>Siguiente →</Link>
      </nav>
      <div style={{ marginBottom: 12 }}>
        <CalendarioSemana hoy={hoy} semana={lunes} marcados={marcados} />
      </div>
      {lunes !== lunesDe(hoy) && (
        <p style={{ margin: "0 0 12px" }}>
          <Link href="/admin/horario" className={styles.enlaceBarra}>
            Ir a esta semana
          </Link>
        </p>
      )}

      {plantillas.length > 0 && (
        <AplicarPlantilla plantillas={plantillas} hoy={hoy} mesInicial={lunes.slice(0, 7)} marcados={marcados} />
      )}

      <p className={estilos.leyenda}>
        <span>
          <IconoUsuario color="#1f9d63" titulo="Apuntadas" /> apuntadas
        </span>
        <span>
          <IconoProhibido color="#d6453d" titulo="Horas para cancelar" /> horas para cancelar
        </span>
        <span>
          <IconoArena color="#e8890c" titulo="Preinscripción" /> días de preinscripción
        </span>
        <span>
          <IconoUsuario color="#3a3a3c" titulo="Alumnas" /> plazas alumnas
        </span>
        <span>
          <IconoUsuario color="#b5b8bd" titulo="Invitadas" /> plazas invitadas
        </span>
      </p>

      <div className={estilos.marco}>
        {horas.length === 0 ? (
          <p className={estilos.vacioSemana}>No hay clases esta semana. Añádelas con el botón de arriba o aplicando una plantilla.</p>
        ) : (
          <div className={estilos.rejilla}>
            <div className={estilos.cabHora}>Hora</div>
            {dias.map((dia, i) => (
              <div key={dia} className={`${estilos.cabDia} ${dia === hoy ? estilos.cabHoy : ""}`}>
                {DIAS[i].slice(0, 3)}
                <small>
                  {Number(dia.slice(8))}/{Number(dia.slice(5, 7))}
                </small>
              </div>
            ))}
            {horas.map((hora) => (
              <Fragment key={hora}>
                <div className={estilos.hora}>{hora}</div>
                {dias.map((dia) => (
                  <div key={dia + hora} className={estilos.celda}>
                    {(porDia.get(dia) ?? [])
                      .filter((c) => textoHora(c.empieza_en) === hora)
                      .map((c) => {
                        const t = c.tipos_clase;
                        const horasGenerales = t?.servicio === "individual" ? ajuste("cancelacion_horas_individual", 12) : ajuste("cancelacion_horas", 2);
                        return (
                          <TarjetaClase
                            key={c.id}
                            c={{
                              id: c.id,
                              tipoId: c.tipo_id,
                              fecha: dia,
                              hora,
                              nombre: t?.nombre ?? "",
                              color: colorDeTipo(t?.color, t?.nombre ?? ""),
                              cancelada: c.estado === "cancelada",
                              apuntadas: c.reservas.filter((r) => r.estado === "reservada").length,
                              plazas: c.plazas,
                              plazasPrueba: c.plazas_prueba,
                              horasCancelar: t?.cancelacion_horas ?? horasGenerales,
                              diasPreinscripcion: t?.reserva_dias_max ?? ajuste("reserva_dias_max", 14),
                              horasPropias: t?.cancelacion_horas ?? null,
                              diasPropios: t?.reserva_dias_max ?? null,
                            }}
                          />
                        );
                      })}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
