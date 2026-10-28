import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, lunesDe, sumarDias, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import { Aplicar, AnadirClase, QuitarCompacto, Renombrar } from "./Controles";
import estiloCuadricula from "./cuadricula.module.css";
import ListaPlantillas, { type ResumenPlantilla } from "./ListaPlantillas";
import ResumenMes, { type ClaseDia } from "./ResumenMes";

export const metadata = { title: "Plantillas presenciales · Administración" };

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Item = {
  id: string;
  tipo_id: string;
  dia_semana: number;
  hora: string;
  plazas: number | null;
  tipos_clase: { nombre: string; plazas_max: number; color: string | null } | null;
};
type Plantilla = { id: string; nombre: string; principal: boolean; plantilla_clases: Item[] };

export default async function Horarios() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("plantillas_horario")
    .select("id, nombre, principal, plantilla_clases(id, tipo_id, dia_semana, hora, plazas, tipos_clase(nombre, plazas_max, color))")
    .order("principal", { ascending: false })
    .order("nombre");
  const plantillas = (data ?? []) as unknown as Plantilla[];

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  const tipos = tiposDatos ?? [];

  const hoy = claveDia(new Date().toISOString());

  // Clases ya publicadas (un mes atrás y varios meses por delante) para el resumen mensual.
  const { data: publicadas } = await supabase
    .from("sesiones_clase")
    .select("empieza_en, tipo_id, tipos_clase(nombre, color)")
    .eq("estado", "programada")
    .gte("empieza_en", instanteMadrid(sumarDias(hoy, -40), "00:00")?.toISOString() ?? new Date().toISOString())
    .lt("empieza_en", instanteMadrid(sumarDias(hoy, 220), "00:00")?.toISOString() ?? new Date().toISOString())
    .order("empieza_en")
    .limit(2500);
  const clasesPorDia: Record<string, ClaseDia[]> = {};
  // «Usada ahora»: la plantilla que más se parece a las clases publicadas esta semana.
  const lunesActual = lunesDe(hoy);
  const publicadasSemana = new Set<string>();
  for (const c of (publicadas ?? []) as unknown as { empieza_en: string; tipo_id: string }[]) {
    const d = claveDia(c.empieza_en);
    if (d < lunesActual || d >= sumarDias(lunesActual, 7)) continue;
    const dia = ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    publicadasSemana.add(`${dia}-${textoHora(c.empieza_en)}-${c.tipo_id}`);
  }
  const parecido = (p: Plantilla) =>
    p.plantilla_clases.length === 0
      ? 0
      : p.plantilla_clases.filter((c) => publicadasSemana.has(`${c.dia_semana}-${c.hora.slice(0, 5)}-${c.tipo_id}`)).length /
        p.plantilla_clases.length;
  const mejor = plantillas.reduce<{ id: string; puntos: number } | null>((m, p) => {
    const puntos = parecido(p);
    return puntos >= 0.6 && (!m || puntos > m.puntos) ? { id: p.id, puntos } : m;
  }, null);
  const usadaAhora = mejor?.id ?? null;

  for (const c of (publicadas ?? []) as unknown as { empieza_en: string; tipos_clase: { nombre: string; color: string | null } | null }[]) {
    const d = claveDia(c.empieza_en);
    const nombre = c.tipos_clase?.nombre ?? "";
    (clasesPorDia[d] ??= []).push({ hora: textoHora(c.empieza_en), nombre, color: colorDeTipo(c.tipos_clase?.color, nombre) });
  }

  const contenidos: Record<string, React.ReactNode> = {};
  for (const p of plantillas) {
        const items = [...p.plantilla_clases].sort((a, b) => a.hora.localeCompare(b.hora));
        contenidos[p.id] = (
          <>

            {items.length > 0 && (
              <div className={estiloCuadricula.desliza}>
                <div className={estiloCuadricula.cuadricula}>
                  <span />
                  {DIAS.map((d) => (
                    <span key={d} className={estiloCuadricula.cabeceraDia}>
                      {d.slice(0, 3)}
                    </span>
                  ))}
                  {[...new Set(items.map((c) => c.hora.slice(0, 5)))].sort().map((hora) => [
                    <span key={`h-${hora}`} className={estiloCuadricula.hora}>
                      {hora}
                    </span>,
                    ...DIAS.map((_, i) => {
                      const celda = items.filter((c) => c.dia_semana === i + 1 && c.hora.slice(0, 5) === hora);
                      return (
                        <div key={`${hora}-${i}`} className={estiloCuadricula.celda}>
                          {celda.map((c) => {
                            const nombre = c.tipos_clase?.nombre ?? "?";
                            const plazas = c.plazas ?? c.tipos_clase?.plazas_max ?? "?";
                            return (
                              <span
                                key={c.id}
                                className={estiloCuadricula.clase}
                                style={{ borderLeftColor: colorDeTipo(c.tipos_clase?.color, nombre) }}
                              >
                                <span>
                                  {nombre} · {plazas}
                                </span>
                                <QuitarCompacto id={c.id} texto={`${hora} ${nombre}`} />
                              </span>
                            );
                          })}
                        </div>
                      );
                    }),
                  ])}
                </div>
              </div>
            )}
            {items.length === 0 && <p className={styles.ayuda}>Esta plantilla todavía no tiene clases.</p>}

            <details className={styles.detalles}>
              <summary>Añadir clases</summary>
              <AnadirClase plantillaId={p.id} tipos={tipos} />
            </details>

            <details className={styles.detalles}>
              <summary>Publicar clases (elegir días)</summary>
              <Aplicar id={p.id} hoy={hoy} />
            </details>

            <details className={styles.detalles}>
              <summary>Nombre y más opciones</summary>
              <Renombrar id={p.id} nombre={p.nombre} />
              <Link href={`/admin/horarios/${p.id}/imprimir`} className={`${styles.boton} ${styles.botonSecundario}`}>
                Imprimir / PDF
              </Link>
            </details>
          </>
        );
  }


  const resumen: ResumenPlantilla[] = plantillas.map((pl) => ({
    id: pl.id,
    nombre: pl.nombre,
    clases: pl.plantilla_clases.length,
    usada: usadaAhora === pl.id,
    principal: pl.principal,
    puedeBorrar: usadaAhora !== pl.id,
  }));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Plantillas presenciales</h1>
        <Link href="/admin/presenciales" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <ListaPlantillas plantillas={resumen} contenidos={contenidos} />

      <section className={styles.tarjeta}>
        <ResumenMes hoy={hoy} clases={clasesPorDia} />
      </section>

    </main>
  );
}
