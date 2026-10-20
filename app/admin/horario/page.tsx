import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, lunesDe, sumarDias, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import { FilaClase } from "../clases/Controles";
import { AnadirClase, AplicarPlantilla, CambiarHora, type TipoOpcion } from "./Controles";
import estilos from "./horario.module.css";

export const metadata = { title: "Horario · Administración" };

type Persona = { nombre: string | null; apellidos: string | null; email: string | null };
type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  plazas_prueba: number;
  estado: string;
  motivo_cancelacion: string | null;
  tipos_clase: { nombre: string; color: string | null } | null;
  reservas: { id: string; estado: string; user_id: string; es_prueba: boolean; profiles: Persona | null }[];
  lista_espera: { id: string; creado_en: string; profiles: Persona | null }[];
};

function nombreDe(p: Persona | null) {
  if (!p) return "(persona borrada)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function etiquetaDia(fecha: string, i: number): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${DIAS[i]} ${d}/${m}`;
}

export default async function Horario({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { supabase } = await requireAdmin();
  const { semana } = await searchParams;

  const hoy = claveDia(new Date().toISOString());
  const base = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : hoy;
  const lunes = lunesDe(base);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  const desde = instanteMadrid(lunes, "00:00")?.toISOString() ?? new Date().toISOString();
  const hasta = instanteMadrid(sumarDias(lunes, 7), "00:00")?.toISOString() ?? desde;

  const [{ data: clasesDatos }, { data: tiposDatos }, { data: plantillasDatos }, { data: alumnosDatos }] = await Promise.all([
    supabase
      .from("sesiones_clase")
      .select(
        "id, empieza_en, plazas, plazas_prueba, estado, motivo_cancelacion, tipos_clase(nombre, color), reservas(id, estado, user_id, es_prueba, profiles(nombre, apellidos, email)), lista_espera(id, creado_en, profiles(nombre, apellidos, email))",
      )
      .gte("empieza_en", desde)
      .lt("empieza_en", hasta)
      .order("empieza_en"),
    supabase.from("tipos_clase").select("id, nombre, plazas_max, plazas_prueba").eq("activo", true).order("nombre"),
    supabase.from("plantillas_horario").select("id, nombre, principal").order("principal", { ascending: false }).order("nombre"),
    supabase.from("profiles").select("id, nombre, apellidos, email").eq("rol", "alumno").order("nombre"),
  ]);
  const clases = (clasesDatos ?? []) as unknown as Clase[];
  const tipos = (tiposDatos ?? []) as TipoOpcion[];
  const plantillas = (plantillasDatos ?? []) as { id: string; nombre: string; principal: boolean }[];
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string })[]).map((a) => ({
    id: a.id,
    texto: nombreDe(a) + (a.nombre && a.email ? ` · ${a.email}` : ""),
  }));

  const porDia = new Map<string, Clase[]>();
  for (const c of clases) {
    const d = claveDia(c.empieza_en);
    porDia.set(d, [...(porDia.get(d) ?? []), c]);
  }

  const anterior = sumarDias(lunes, -7);
  const siguiente = sumarDias(lunes, 7);
  const [, m1, d1] = lunes.split("-").map(Number);
  const [, m2, d2] = dias[6].split("-").map(Number);

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Horario</h1>
        <Link href="/admin/horarios" className={styles.enlaceBarra}>
          Plantillas
        </Link>
      </header>

      <nav className={estilos.navegacion} aria-label="Cambiar de semana">
        <Link href={`/admin/horario?semana=${anterior}`}>← Anterior</Link>
        <h2 className={estilos.titulo}>
          {d1}/{m1} – {d2}/{m2}
        </h2>
        <Link href={`/admin/horario?semana=${siguiente}`}>Siguiente →</Link>
      </nav>
      {lunes !== lunesDe(hoy) && (
        <p style={{ margin: "0 0 12px" }}>
          <Link href="/admin/horario" className={styles.enlaceBarra}>
            Ir a esta semana
          </Link>
        </p>
      )}

      {plantillas.length > 0 && (
        <AplicarPlantilla
          plantillas={plantillas}
          dias={dias.map((d, i) => ({ fecha: d, etiqueta: etiquetaDia(d, i) }))}
        />
      )}

      <div className={estilos.semana}>
        {dias.map((dia, i) => {
          const lista = porDia.get(dia) ?? [];
          return (
            <section key={dia} className={`${estilos.dia} ${dia === hoy ? estilos.hoy : ""}`}>
              <h2>{etiquetaDia(dia, i)}</h2>
              {lista.length === 0 && <p className={estilos.vacio}>Sin clases.</p>}
              {lista.map((c) => {
                const cancelada = c.estado === "cancelada";
                const apuntados = c.reservas
                  .filter((r) => r.estado === "reservada")
                  .map((r) => ({ reservaId: r.id, userId: r.user_id, nombre: nombreDe(r.profiles), prueba: r.es_prueba }));
                const espera = [...c.lista_espera]
                  .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
                  .map((e) => ({ esperaId: e.id, nombre: nombreDe(e.profiles) }));
                const nombre = c.tipos_clase?.nombre ?? "";
                return (
                  <div
                    key={c.id}
                    className={`${estilos.clase} ${cancelada ? estilos.cancelada : ""}`}
                    style={{ borderLeftColor: colorDeTipo(c.tipos_clase?.color, nombre) }}
                  >
                    <strong>
                      {textoHora(c.empieza_en)} · {nombre}
                      {cancelada && " (cancelada)"}
                    </strong>
                    <small>
                      {apuntados.length}/{c.plazas} plazas
                    </small>
                    <FilaClase
                      clase={{
                        id: c.id,
                        plazas: c.plazas,
                        plazasPrueba: c.plazas_prueba,
                        cancelada,
                        motivo: c.motivo_cancelacion,
                        apuntados,
                        espera,
                        alumnos,
                      }}
                    />
                    {!cancelada && <CambiarHora id={c.id} fecha={dia} hora={textoHora(c.empieza_en)} />}
                  </div>
                );
              })}
              <AnadirClase fecha={dia} tipos={tipos} />
            </section>
          );
        })}
      </div>
    </main>
  );
}
