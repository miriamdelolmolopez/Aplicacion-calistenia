import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { PERIODOS, rangoDe, type Periodo } from "@/lib/periodos";
import styles from "../admin.module.css";
import { BarrasHorizontales, BarrasMensuales, nombreMes } from "./Graficos";
import estilos from "./estadisticas.module.css";

export const metadata = { title: "Estadísticas · Administración" };

type Informe = {
  periodo: { desde: string; hasta: string; dias: number };
  personas: { total: number; alumnas: number; invitadas: number; activas: number };
  por_servicio: { grupal: number; individual: number; online: number; sin_servicio: number };
  por_sexo: { mujer: number; hombre: number; otro: number; sin_dato: number };
  por_edad: Record<string, number>;
  altas_mensuales: { mes: string; altas: number }[];
  tarifas: { nombre: string; servicio: string; contratadas: number; ingresos: number }[];
  implicadas: { id: string; nombre: string; clases: number; entrenos: number; total: number }[];
  ingresos: {
    total_periodo: number;
    total_periodo_anterior: number;
    total_mismo_periodo_ano_anterior: number;
    descuentos_periodo: number;
    pendiente_cobro: number;
    pagos_periodo: number;
    por_metodo: { metodo: string; total: number }[];
    por_servicio: { servicio: string; total: number }[];
    mensual: { mes: string; total: number; ano_anterior: number }[];
    anual: { este_ano: number; ano_anterior: number };
  };
  conversion: { pruebas: number; convertidas: number };
  ocupacion: { tipo: string; hora: string; clases: number; ocupacion: number }[];
  clases_canceladas: number;
};

const METODOS: Record<string, string> = { efectivo: "Efectivo", bizum: "Bizum", transferencia: "Transferencia", tarjeta: "Tarjeta" };
const SERVICIOS: Record<string, string> = { grupal: "Clases grupales", individual: "Individual", online: "Online", otros: "Otros" };
const EDADES: [string, string][] = [
  ["menos_18", "Menos de 18"],
  ["de_18_a_25", "18 a 25"],
  ["de_26_a_35", "26 a 35"],
  ["de_36_a_45", "36 a 45"],
  ["de_46_a_55", "46 a 55"],
  ["mas_55", "Más de 55"],
  ["sin_dato", "Sin fecha de nacimiento"],
];

// ▲ +12 % / ▼ −5 % respecto a otra cifra.
function Variacion({ actual, antes, etiqueta }: { actual: number; antes: number; etiqueta: string }) {
  if (antes === 0) return <small>{etiqueta}: sin datos</small>;
  const pct = Math.round(((actual - antes) / antes) * 100);
  return (
    <small className={pct >= 0 ? estilos.sube : estilos.baja}>
      {pct >= 0 ? "▲" : "▼"} {pct >= 0 ? "+" : ""}
      {pct} % {etiqueta}
    </small>
  );
}

export default async function Estadisticas({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>;
}) {
  const { periodo: p, desde: d, hasta: h } = await searchParams;
  const { supabase } = await requireAdmin();

  const periodo: Periodo = PERIODOS.some((x) => x.id === p) ? (p as Periodo) : "mes";
  const hoy = claveDia(new Date().toISOString());
  const rango = rangoDe(periodo, hoy, d, h);

  const { data, error } = await supabase.rpc("estadisticas", { p_desde: rango.desde, p_hasta: rango.hasta });
  const i = data as Informe | null;

  const sufijoFechas = `${fechaCorta(`${rango.desde}T12:00:00Z`)} – ${fechaCorta(`${rango.hasta}T12:00:00Z`)}`;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Estadísticas</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <div className={estilos.periodos}>
          {PERIODOS.filter((x) => x.id !== "personalizado").map((x) => (
            <Link
              key={x.id}
              href={`/admin/estadisticas?periodo=${x.id}`}
              className={`${estilos.periodo} ${periodo === x.id ? estilos.periodoActivo : ""}`}
            >
              {x.texto}
            </Link>
          ))}
        </div>
        <form method="get" className={estilos.fechas}>
          <input type="hidden" name="periodo" value="personalizado" />
          <div className={styles.campo}>
            <label htmlFor="desde">Desde</label>
            <input id="desde" name="desde" type="date" defaultValue={rango.desde} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="hasta">Hasta</label>
            <input id="hasta" name="hasta" type="date" defaultValue={rango.hasta} />
          </div>
          <button type="submit" className={`${styles.boton} ${styles.botonSecundario}`}>
            Ver ese periodo
          </button>
        </form>
        <p className={styles.ayuda}>Periodo mostrado: {sufijoFechas}</p>
      </section>

      {error || !i ? (
        <p className={styles.error}>No se han podido calcular las estadísticas.</p>
      ) : (
        <>
          <section className={styles.tarjeta}>
            <h2>Resumen</h2>
            <div className={estilos.cifras}>
              <div className={estilos.cifra}>
                <strong>{i.personas.activas}</strong>
                <small>alumnas activas</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.personas.alumnas}</strong>
                <small>alumnas en total</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.personas.invitadas}</strong>
                <small>invitadas registradas</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.clases_canceladas}</strong>
                <small>clases canceladas en el periodo</small>
              </div>
            </div>
            <p className={styles.ayuda}>
              «Activa» = alumna con un bono o plan en vigor, o que ha venido a clase o entrenado en los últimos 30 días.
            </p>
          </section>

          <section className={styles.tarjeta}>
            <h2>Ingresos</h2>
            <div className={estilos.cifras}>
              <div className={estilos.cifra}>
                <strong>{euros(i.ingresos.total_periodo)}</strong>
                <small>cobrado en el periodo ({i.ingresos.pagos_periodo} pagos)</small>
                <Variacion actual={i.ingresos.total_periodo} antes={i.ingresos.total_periodo_anterior} etiqueta="vs periodo anterior" />
                <Variacion actual={i.ingresos.total_periodo} antes={i.ingresos.total_mismo_periodo_ano_anterior} etiqueta="vs mismo periodo del año pasado" />
              </div>
              <div className={estilos.cifra}>
                <strong>{euros(i.ingresos.pendiente_cobro)}</strong>
                <small>pendiente de cobro (todos los pagos pendientes)</small>
                <small>Descuentos concedidos: {euros(i.ingresos.descuentos_periodo)}</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{euros(i.ingresos.anual.este_ano)}</strong>
                <small>este año</small>
                <Variacion actual={i.ingresos.anual.este_ano} antes={i.ingresos.anual.ano_anterior} etiqueta="vs el año pasado (completo)" />
              </div>
              <div className={estilos.cifra}>
                <strong>{euros(i.ingresos.anual.ano_anterior)}</strong>
                <small>año pasado</small>
              </div>
            </div>

            <h3 style={{ margin: "8px 0 0" }}>Últimos 12 meses</h3>
            <BarrasMensuales
              formato={euros}
              datos={i.ingresos.mensual.map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))}
            />
            <div className={estilos.leyenda}>
              <span>
                <i style={{ background: "var(--oliva)" }} />
                Ese mes
              </span>
              <span>
                <i style={{ background: "#cfd3b3" }} />
                El mismo mes del año pasado
              </span>
            </div>
            <table className={estilos.tabla}>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cobrado</th>
                  <th>Año pasado</th>
                </tr>
              </thead>
              <tbody>
                {[...i.ingresos.mensual].reverse().map((m) => (
                  <tr key={m.mes}>
                    <td>{nombreMes(m.mes)}</td>
                    <td>{euros(m.total)}</td>
                    <td>{euros(m.ano_anterior)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ margin: "8px 0 0" }}>Por método de pago (periodo)</h3>
            {i.ingresos.por_metodo.length === 0 ? (
              <p className={styles.ayuda}>No hay cobros en este periodo.</p>
            ) : (
              <BarrasHorizontales
                formato={euros}
                filas={i.ingresos.por_metodo.map((m) => ({ texto: METODOS[m.metodo] ?? m.metodo, valor: m.total }))}
              />
            )}
            <h3 style={{ margin: "8px 0 0" }}>Por tipo de servicio (periodo)</h3>
            {i.ingresos.por_servicio.length === 0 ? (
              <p className={styles.ayuda}>No hay cobros en este periodo.</p>
            ) : (
              <BarrasHorizontales
                formato={euros}
                filas={i.ingresos.por_servicio.map((m) => ({ texto: SERVICIOS[m.servicio] ?? m.servicio, valor: m.total }))}
              />
            )}
          </section>

          <section className={styles.tarjeta}>
            <h2>Quién entrena contigo (alumnas activas)</h2>
            <h3 style={{ margin: 0 }}>Por tipo de alumna</h3>
            <BarrasHorizontales
              filas={[
                { texto: "Clases grupales", valor: i.por_servicio.grupal },
                { texto: "Individuales", valor: i.por_servicio.individual },
                { texto: "Online", valor: i.por_servicio.online },
                { texto: "Sin servicio asignado", valor: i.por_servicio.sin_servicio },
              ]}
            />
            <p className={styles.ayuda}>Una alumna con varios servicios cuenta en cada uno.</p>
            <h3 style={{ margin: "8px 0 0" }}>Por sexo</h3>
            <BarrasHorizontales
              filas={[
                { texto: "Mujeres", valor: i.por_sexo.mujer },
                { texto: "Hombres", valor: i.por_sexo.hombre },
                { texto: "Otro", valor: i.por_sexo.otro },
                { texto: "Sin indicar", valor: i.por_sexo.sin_dato },
              ]}
            />
            <h3 style={{ margin: "8px 0 0" }}>Por edad</h3>
            <BarrasHorizontales filas={EDADES.map(([k, texto]) => ({ texto, valor: i.por_edad[k] ?? 0 }))} />
            <h3 style={{ margin: "8px 0 0" }}>Altas nuevas por mes</h3>
            <BarrasMensuales formato={(n) => `${n} altas`} datos={i.altas_mensuales.map((a) => ({ mes: a.mes, total: a.altas }))} />
          </section>

          <section className={styles.tarjeta}>
            <h2>Tarifas más contratadas</h2>
            {i.tarifas.length === 0 ? (
              <p className={styles.ayuda}>No se ha contratado ninguna tarifa en este periodo.</p>
            ) : (
              <BarrasHorizontales
                filas={i.tarifas.map((t) => ({
                  texto: t.nombre,
                  valor: t.contratadas,
                  detalle: `${SERVICIOS[t.servicio] ?? t.servicio} · cobrado: ${euros(t.ingresos)}`,
                }))}
                formato={(n) => `${n} ${n === 1 ? "vez" : "veces"}`}
              />
            )}
          </section>

          <section className={styles.tarjeta}>
            <h2>Alumnas más implicadas</h2>
            <p className={styles.ayuda}>Las que más clases y entrenos suman en el periodo.</p>
            {i.implicadas.length === 0 ? (
              <p className={styles.ayuda}>Todavía no hay actividad en este periodo.</p>
            ) : (
              <ol className={estilos.ranking}>
                {i.implicadas.map((a, n) => (
                  <li key={a.id}>
                    <span>
                      {n + 1}. <Link href={`/admin/usuarios/${a.id}`}>{a.nombre || "(sin nombre)"}</Link>
                    </span>
                    <span>
                      {a.clases} clases · {a.entrenos} entrenos
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={styles.tarjeta}>
            <h2>De invitada a alumna</h2>
            <p style={{ margin: 0 }}>
              {i.conversion.pruebas === 0
                ? "No ha habido clases de prueba en este periodo."
                : `${i.conversion.convertidas} de ${i.conversion.pruebas} ${i.conversion.pruebas === 1 ? "persona que hizo" : "personas que hicieron"} la clase de prueba ya ${i.conversion.convertidas === 1 ? "ha contratado" : "han contratado"} un bono (${Math.round((i.conversion.convertidas / i.conversion.pruebas) * 100)} %).`}
            </p>
          </section>

          <section className={styles.tarjeta}>
            <h2>Ocupación de las clases</h2>
            <p className={styles.ayuda}>Porcentaje medio de plazas ocupadas en las clases del periodo que ya han pasado.</p>
            {i.ocupacion.length === 0 ? (
              <p className={styles.ayuda}>No hay clases pasadas en este periodo.</p>
            ) : (
              <BarrasHorizontales
                formato={(n) => `${n} %`}
                filas={i.ocupacion.map((o) => ({
                  texto: `${o.tipo} · ${o.hora}`,
                  valor: o.ocupacion,
                  detalle: `${o.clases} ${o.clases === 1 ? "clase" : "clases"}`,
                }))}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
