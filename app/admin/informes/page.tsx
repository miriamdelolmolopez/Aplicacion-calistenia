import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { cumpleanos, informeAtletas, ingresosPorMesYServicio, type PersonaLinea } from "@/lib/informes";
import { PERIODOS, rangoDe, type Periodo } from "@/lib/periodos";
import styles from "../admin.module.css";
import { BarrasHorizontales, BarrasMensuales, nombreMes } from "../estadisticas/Graficos";
import estilos from "../estadisticas/estadisticas.module.css";
import GraficoElegible, { type Opcion } from "./GraficoElegible";

export const metadata = { title: "Informes · Administración" };

type Informe = {
  personas: { total: number; alumnas: number; invitadas: number; activas: number };
  por_servicio: { grupal: number; individual: number; online: number; sin_servicio: number };
  por_sexo: { mujer: number; hombre: number; otro: number; sin_dato: number };
  por_edad: Record<string, number>;
  altas_mensuales: { mes: string; altas: number }[];
  tarifas: { nombre: string; servicio: string; contratadas: number; ingresos: number }[];
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
};

type Vista = "atletas" | "pagos" | "cumpleanos";

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

function Variacion({ actual, antes, etiqueta }: { actual: number; antes: number; etiqueta: string }) {
  if (antes === 0) return <small>{etiqueta}: sin datos</small>;
  const pct = Math.round(((actual - antes) / antes) * 100);
  return (
    <small className={pct >= 0 ? estilos.sube : estilos.baja}>
      {pct >= 0 ? "▲ +" : "▼ "}
      {pct} % {etiqueta}
    </small>
  );
}

function Lista({ personas, vacio }: { personas: PersonaLinea[]; vacio: string }) {
  if (personas.length === 0) return <p className={styles.ayuda}>{vacio}</p>;
  return (
    <ol className={estilos.ranking}>
      {personas.map((p, n) => (
        <li key={`${p.id}-${n}`}>
          <span>
            <Link href={`/admin/usuarios/${p.id}`}>{p.nombre}</Link>
          </span>
          <span>{p.detalle}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function Informes({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; periodo?: string; desde?: string; hasta?: string }>;
}) {
  const { vista: v, periodo: p, desde: d, hasta: h } = await searchParams;
  const { supabase } = await requireAdmin();

  const vista: Vista = v === "pagos" || v === "cumpleanos" ? v : "atletas";
  const periodo: Periodo = PERIODOS.some((x) => x.id === p) ? (p as Periodo) : "mes";
  const hoy = claveDia(new Date().toISOString());
  const rango = rangoDe(periodo, hoy, d, h);
  const sufijo = `${fechaCorta(`${rango.desde}T12:00:00Z`)} – ${fechaCorta(`${rango.hasta}T12:00:00Z`)}`;

  const [{ data }, atletas, meses, cumples] = await Promise.all([
    supabase.rpc("estadisticas", { p_desde: rango.desde, p_hasta: rango.hasta }),
    vista !== "cumpleanos" ? informeAtletas(rango) : Promise.resolve(null),
    vista === "pagos" ? ingresosPorMesYServicio(rango.hasta) : Promise.resolve(null),
    vista === "cumpleanos" ? cumpleanos(rango) : Promise.resolve(null),
  ]);
  const i = data as Informe | null;

  const base = (extra: string) => `/admin/informes?vista=${vista}${extra}`;
  const parametrosPeriodo = periodo === "personalizado" ? `&periodo=personalizado&desde=${rango.desde}&hasta=${rango.hasta}` : `&periodo=${periodo}`;
  const pestana = (id: Vista, texto: string) => (
    <Link href={`/admin/informes?vista=${id}${parametrosPeriodo}`} className={`${estilos.periodo} ${vista === id ? estilos.periodoActivo : ""}`}>
      {texto}
    </Link>
  );

  const opciones: Opcion[] =
    i && atletas
      ? [
          {
            id: "servicio",
            titulo: "Alumnas por tipo de servicio",
            nota: "Una alumna con varios servicios cuenta en cada uno.",
            formato: "n",
            tipo: "barras",
            filas: [
              { texto: "Clases grupales", valor: i.por_servicio.grupal },
              { texto: "Individuales", valor: i.por_servicio.individual },
              { texto: "Online", valor: i.por_servicio.online },
              { texto: "Sin servicio asignado", valor: i.por_servicio.sin_servicio },
            ],
          },
          { id: "edad", titulo: "Alumnas por edad", formato: "n", tipo: "barras", filas: EDADES.map(([k, texto]) => ({ texto, valor: i.por_edad[k] ?? 0 })) },
          {
            id: "sexo",
            titulo: "Alumnas por sexo",
            formato: "n",
            tipo: "barras",
            filas: [
              { texto: "Mujeres", valor: i.por_sexo.mujer },
              { texto: "Hombres", valor: i.por_sexo.hombre },
              { texto: "Otro", valor: i.por_sexo.otro },
              { texto: "Sin indicar", valor: i.por_sexo.sin_dato },
            ],
          },
          {
            id: "ocupacion",
            titulo: "Ocupación de cada clase de la semana",
            nota: "Porcentaje medio de plazas ocupadas en las clases del periodo que ya han pasado, clase por clase y día por día.",
            formato: "pct",
            tipo: "barras",
            filas: atletas.ocupacion,
          },
          {
            id: "nuevos",
            titulo: "Nuevas alumnas por mes",
            formato: "n",
            tipo: "mensual",
            meses: i.altas_mensuales.map((a) => ({ mes: a.mes, total: a.altas })),
          },
          {
            id: "tarifas",
            titulo: "Tarifas más contratadas",
            formato: "veces",
            tipo: "barras",
            filas: i.tarifas.map((t) => ({ texto: t.nombre, valor: t.contratadas, detalle: `${SERVICIOS[t.servicio] ?? t.servicio} · cobrado: ${euros(t.ingresos)}` })),
          },
        ]
      : [];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Informes</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <div className={estilos.periodos}>
        {pestana("atletas", "Atletas")}
        {pestana("pagos", "Pagos")}
        {pestana("cumpleanos", "Cumpleaños")}
      </div>

      <section className={styles.tarjeta}>
        <div className={estilos.periodos}>
          {PERIODOS.filter((x) => x.id !== "personalizado").map((x) => (
            <Link key={x.id} href={base(`&periodo=${x.id}`)} className={`${estilos.periodo} ${periodo === x.id ? estilos.periodoActivo : ""}`}>
              {x.texto}
            </Link>
          ))}
        </div>
        <form method="get" className={estilos.fechas}>
          <input type="hidden" name="vista" value={vista} />
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
        <p className={styles.ayuda}>Periodo mostrado: {sufijo}</p>
      </section>

      {vista !== "cumpleanos" && (!i || !atletas) && <p className={styles.error}>No se han podido calcular los informes.</p>}

      {vista === "atletas" && i && atletas && (
        <>
          <section className={styles.tarjeta}>
            <h2>Atletas activas</h2>
            <div className={estilos.cifras}>
              <div className={estilos.cifra}>
                <strong>{i.por_servicio.grupal}</strong>
                <small>grupales</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.por_servicio.individual}</strong>
                <small>individuales</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.por_servicio.online}</strong>
                <small>online</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{i.personas.invitadas}</strong>
                <small>invitadas</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{atletas.pruebas}</strong>
                <small>han probado una clase en el periodo</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{atletas.nuevos.length}</strong>
                <small>nuevas en el periodo</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{atletas.perdidas.length}</strong>
                <small>perdidas (no renovaron)</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{atletas.totalAusencias}</strong>
                <small>ausencias (no se presentaron)</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{atletas.retencion ? `${Math.round((atletas.retencion.siguen / atletas.retencion.base) * 100)} %` : "—"}</strong>
                <small>
                  {atletas.retencion
                    ? `retención: ${atletas.retencion.siguen} de ${atletas.retencion.base} siguen`
                    : "retención: sin alumnas al empezar el periodo"}
                </small>
              </div>
            </div>
            <p className={styles.ayuda}>
              «Activa» = con un bono o plan en vigor. «Perdida» = su último bono terminó en el periodo y no tiene otro. «Retención» = de las
              que tenían bono al empezar el periodo, cuántas lo siguen teniendo al final.
            </p>
            <a href="/admin/exportar/atletas" download className={styles.boton}>
              Descargar la lista de atletas (Excel)
            </a>
            <p className={styles.ayuda}>
              Incluye DNI, nombre, apellidos, correo, teléfono, cumpleaños, fecha de alta, tarifa actual, descuentos, dinero gastado, pagado
              hasta, sexo, días sin entrenar y días desde el alta.
            </p>
          </section>

          <section className={styles.tarjeta}>
            <h2>Gráficos</h2>
            <GraficoElegible opciones={opciones} />
          </section>

          <section className={styles.tarjeta}>
            <h2>Nuevas en el periodo ({atletas.nuevos.length})</h2>
            <Lista personas={atletas.nuevos} vacio="Nadie ha empezado en este periodo." />
          </section>
          <section className={styles.tarjeta}>
            <h2>Perdidas ({atletas.perdidas.length})</h2>
            <Lista personas={atletas.perdidas} vacio="Nadie ha dejado de renovar en este periodo." />
          </section>
          <section className={styles.tarjeta}>
            <h2>Ausencias ({atletas.totalAusencias})</h2>
            <Lista
              personas={atletas.ausencias.map((a) => ({ id: a.id, nombre: a.nombre, detalle: `${a.veces} ${a.veces === 1 ? "vez" : "veces"}` }))}
              vacio="Nadie ha faltado sin avisar en este periodo."
            />
          </section>
        </>
      )}

      {vista === "pagos" && i && atletas && meses && (
        <>
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
                <small>pendiente de cobro</small>
                <small>Descuentos concedidos: {euros(i.ingresos.descuentos_periodo)}</small>
              </div>
              <div className={estilos.cifra}>
                <strong>{euros(i.ingresos.anual.este_ano)}</strong>
                <small>este año</small>
                <Variacion actual={i.ingresos.anual.este_ano} antes={i.ingresos.anual.ano_anterior} etiqueta="vs el año pasado (completo)" />
              </div>
            </div>

            <h3 style={{ margin: "8px 0 0" }}>Ingresos por tipo de servicio (periodo)</h3>
            {i.ingresos.por_servicio.length === 0 ? (
              <p className={styles.ayuda}>No hay cobros en este periodo.</p>
            ) : (
              <BarrasHorizontales formato={euros} filas={i.ingresos.por_servicio.map((m) => ({ texto: SERVICIOS[m.servicio] ?? m.servicio, valor: m.total }))} />
            )}

            <h3 style={{ margin: "8px 0 0" }}>Ingresos por mes (últimos 12 meses)</h3>
            <BarrasMensuales formato={euros} datos={i.ingresos.mensual.map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))} />

            <h3 style={{ margin: "8px 0 0" }}>Por mes y tipo de servicio</h3>
            <div style={{ overflowX: "auto" }}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Grupales</th>
                    <th>Individuales</th>
                    <th>Online</th>
                    <th>Otros</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...meses].reverse().map((m) => (
                    <tr key={m.mes}>
                      <td>{nombreMes(m.mes)}</td>
                      <td>{euros(m.grupal)}</td>
                      <td>{euros(m.individual)}</td>
                      <td>{euros(m.online)}</td>
                      <td>{euros(m.otros)}</td>
                      <td>
                        <strong>{euros(m.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ margin: "8px 0 0" }}>Por método de pago (periodo)</h3>
            {i.ingresos.por_metodo.length === 0 ? (
              <p className={styles.ayuda}>No hay cobros en este periodo.</p>
            ) : (
              <BarrasHorizontales formato={euros} filas={i.ingresos.por_metodo.map((m) => ({ texto: METODOS[m.metodo] ?? m.metodo, valor: m.total }))} />
            )}
          </section>

          <section className={styles.tarjeta}>
            <h2>Alumnas perdidas ({atletas.perdidas.length})</h2>
            <Lista personas={atletas.perdidas} vacio="Nadie ha dejado de renovar en este periodo." />
          </section>
          <section className={styles.tarjeta}>
            <h2>Ausencias ({atletas.totalAusencias})</h2>
            <Lista
              personas={atletas.ausencias.map((a) => ({ id: a.id, nombre: a.nombre, detalle: `${a.veces} ${a.veces === 1 ? "vez" : "veces"}` }))}
              vacio="Nadie ha faltado sin avisar en este periodo."
            />
          </section>
        </>
      )}

      {vista === "cumpleanos" && cumples && (
        <section className={styles.tarjeta}>
          <h2>Cumpleaños del periodo ({cumples.length})</h2>
          {cumples.length === 0 ? (
            <p className={styles.ayuda}>No hay cumpleaños en este periodo.</p>
          ) : (
            <ol className={estilos.ranking}>
              {cumples.map((c, n) => (
                <li key={`${c.id}-${n}`}>
                  <span>
                    {c.fecha === hoy && "🎂 "}
                    <Link href={`/admin/usuarios/${c.id}`}>{c.nombre}</Link>
                  </span>
                  <span>
                    {fechaCorta(`${c.fecha}T12:00:00Z`)} · cumple {c.edad}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
