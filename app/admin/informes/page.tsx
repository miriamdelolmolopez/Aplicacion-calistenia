import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { nombresFormas } from "@/lib/formasPago";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { cumpleanos, informeAtletas, ingresosPorMesYServicio, type PersonaLinea } from "@/lib/informes";
import { PERIODOS, rangoDe, type Periodo } from "@/lib/periodos";
import styles from "../admin.module.css";
import { BarrasHorizontales, BarrasMensuales, nombreMes } from "../estadisticas/Graficos";
import estilos from "../estadisticas/estadisticas.module.css";
import { BarrasApiladas, BarrasColores, Cambio, COLOR_SERVICIO, LineaMensual, PALETA, Rosca, TarjetaCifra } from "./GraficosPagos";
import g from "./informes.module.css";

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
  const METODOS = await nombresFormas();

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

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Informes</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <div className={estilos.periodos}>
        {pestana("atletas", "Atletas")}
        {pestana("pagos", "Pagos")}
        {pestana("cumpleanos", "Cumpleaños")}
      </div>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>Periodo mostrado: {sufijo}</p>
        <div className={g.filtros}>
          <div className={estilos.periodos}>
            {PERIODOS.filter((x) => x.id !== "personalizado").map((x) => (
              <Link key={x.id} href={base(`&periodo=${x.id}`)} className={`${estilos.periodo} ${periodo === x.id ? estilos.periodoActivo : ""}`}>
                {x.texto}
              </Link>
            ))}
          </div>
          <form method="get" className={g.fechasFila}>
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
        </div>
      </section>

      {vista !== "cumpleanos" && (!i || !atletas) && <p className={styles.error}>No se han podido calcular los informes.</p>}

      {vista === "atletas" && i && atletas && (
        <>
          <section className={styles.tarjeta}>
            <h2>Atletas</h2>
            <div className={g.tarjetas}>
              <TarjetaCifra
                titulo="Activas"
                valor={String(i.personas.activas)}
                color="#0aa8c0"
                notas={<span>{i.personas.alumnas} alumnas · {i.personas.invitadas} invitadas</span>}
              />
              <TarjetaCifra
                titulo="Nuevas en el periodo"
                valor={String(atletas.nuevos.length)}
                color="#2fb57a"
                notas={<span>{atletas.pruebas} han probado una clase</span>}
              />
              <TarjetaCifra
                titulo="Perdidas"
                valor={String(atletas.perdidas.length)}
                color="#ef5f8b"
                notas={<span>No renovaron su bono</span>}
              />
              <TarjetaCifra
                titulo="Retención"
                valor={atletas.retencion ? `${Math.round((atletas.retencion.siguen / atletas.retencion.base) * 100)} %` : "—"}
                color="#6d5efc"
                notas={<span>{atletas.retencion ? `${atletas.retencion.siguen} de ${atletas.retencion.base} siguen` : "Sin alumnas al empezar el periodo"}</span>}
              />
              <TarjetaCifra
                titulo="Ausencias"
                valor={String(atletas.totalAusencias)}
                color="#f5a524"
                notas={<span>No se presentaron a su clase</span>}
              />
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
            <div className={g.rejilla2}>
              <div className={g.bloque}>
                <h3>Alumnas por tipo de servicio</h3>
                <p className={g.vacio}>Una alumna con varios servicios cuenta en cada uno.</p>
                <Rosca
                  formato={String}
                  total={i.por_servicio.grupal + i.por_servicio.individual + i.por_servicio.online}
                  centro={String(i.por_servicio.grupal + i.por_servicio.individual + i.por_servicio.online)}
                  subtitulo="servicios"
                  filas={[
                    { texto: "Clases grupales", valor: i.por_servicio.grupal, color: COLOR_SERVICIO.grupal },
                    { texto: "Individuales", valor: i.por_servicio.individual, color: COLOR_SERVICIO.individual },
                    { texto: "Online", valor: i.por_servicio.online, color: COLOR_SERVICIO.online },
                    { texto: "Sin servicio asignado", valor: i.por_servicio.sin_servicio, color: COLOR_SERVICIO.otros },
                  ]}
                />
              </div>
              <div className={g.bloque}>
                <h3>Alumnas por sexo</h3>
                <Rosca
                  formato={String}
                  total={i.por_sexo.mujer + i.por_sexo.hombre + i.por_sexo.otro + i.por_sexo.sin_dato}
                  centro={String(i.por_sexo.mujer + i.por_sexo.hombre + i.por_sexo.otro + i.por_sexo.sin_dato)}
                  subtitulo="personas"
                  filas={[
                    { texto: "Mujeres", valor: i.por_sexo.mujer, color: PALETA[3] },
                    { texto: "Hombres", valor: i.por_sexo.hombre, color: PALETA[0] },
                    { texto: "Otro", valor: i.por_sexo.otro, color: PALETA[1] },
                    { texto: "Sin indicar", valor: i.por_sexo.sin_dato, color: PALETA[5] },
                  ]}
                />
              </div>
            </div>

            <div className={g.bloque}>
              <h3>Alumnas por edad</h3>
              <BarrasColores formato={String} filas={EDADES.map(([k, texto], n) => ({ texto, valor: i.por_edad[k] ?? 0, color: PALETA[n % PALETA.length] }))} />
            </div>

            <div className={g.bloque}>
              <h3>Nuevas alumnas por mes</h3>
              <LineaMensual formato={String} entero datos={i.altas_mensuales.map((m) => ({ mes: m.mes, total: m.altas }))} />
            </div>

            <div className={g.rejilla2}>
              <div className={g.bloque}>
                <h3>Ocupación de cada clase</h3>
                <p className={g.vacio}>Porcentaje medio de plazas ocupadas en las clases del periodo que ya han pasado.</p>
                {atletas.ocupacion.length === 0 ? (
                  <p className={g.vacio}>Sin clases en este periodo.</p>
                ) : (
                  <BarrasColores porcentaje={false} formato={(n) => `${n} %`} filas={atletas.ocupacion.map((f, n) => ({ texto: f.texto, valor: f.valor, color: PALETA[n % PALETA.length] }))} />
                )}
              </div>
              <div className={g.bloque}>
                <h3>Tarifas más contratadas</h3>
                {i.tarifas.length === 0 ? (
                  <p className={g.vacio}>Todavía no hay datos.</p>
                ) : (
                  <BarrasColores
                    formato={(n) => `${n} ${n === 1 ? "vez" : "veces"}`}
                    filas={i.tarifas.map((t, n) => ({ texto: t.nombre, valor: t.contratadas, color: PALETA[n % PALETA.length] }))}
                  />
                )}
              </div>
            </div>
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
            <div className={g.tarjetas}>
              <TarjetaCifra
                titulo="Cobrado en el periodo"
                valor={euros(i.ingresos.total_periodo)}
                color="#0aa8c0"
                notas={
                  <>
                    <span>{i.ingresos.pagos_periodo} pagos</span>
                    <Cambio actual={i.ingresos.total_periodo} antes={i.ingresos.total_periodo_anterior} etiqueta="vs periodo anterior" />
                    <Cambio actual={i.ingresos.total_periodo} antes={i.ingresos.total_mismo_periodo_ano_anterior} etiqueta="vs el año pasado" />
                  </>
                }
              />
              <TarjetaCifra
                titulo="Pendiente de cobro"
                valor={euros(i.ingresos.pendiente_cobro)}
                color="#f5a524"
                notas={<span>Descuentos concedidos: {euros(i.ingresos.descuentos_periodo)}</span>}
              />
              <TarjetaCifra
                titulo="Este año"
                valor={euros(i.ingresos.anual.este_ano)}
                color="#6d5efc"
                notas={<Cambio actual={i.ingresos.anual.este_ano} antes={i.ingresos.anual.ano_anterior} etiqueta="vs el año pasado (completo)" />}
              />
              <TarjetaCifra
                titulo="Pago medio"
                valor={euros(i.ingresos.pagos_periodo > 0 ? Math.round(i.ingresos.total_periodo / i.ingresos.pagos_periodo) : 0)}
                color="#2fb57a"
                notas={<span>Importe medio de cada pago cobrado</span>}
              />
            </div>

            <div className={g.bloque}>
              <h3>Ingresos mes a mes</h3>
              <p className={g.vacio}>Línea de color: los últimos 12 meses. Línea gris punteada: el mismo mes del año anterior.</p>
              <LineaMensual datos={i.ingresos.mensual.map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))} />
            </div>

            <div className={g.rejilla2}>
              <div className={g.bloque}>
                <h3>Por tipo de servicio</h3>
                {i.ingresos.por_servicio.length === 0 ? (
                  <p className={g.vacio}>No hay cobros en este periodo.</p>
                ) : (
                  <Rosca
                    total={i.ingresos.total_periodo}
                    filas={i.ingresos.por_servicio.map((m) => ({ texto: SERVICIOS[m.servicio] ?? m.servicio, valor: m.total, color: COLOR_SERVICIO[m.servicio] ?? COLOR_SERVICIO.otros }))}
                  />
                )}
              </div>
              <div className={g.bloque}>
                <h3>Por método de pago</h3>
                {i.ingresos.por_metodo.length === 0 ? (
                  <p className={g.vacio}>No hay cobros en este periodo.</p>
                ) : (
                  <BarrasColores filas={i.ingresos.por_metodo.map((m, n) => ({ texto: METODOS[m.metodo] ?? m.metodo, valor: m.total, color: PALETA[n % PALETA.length] }))} />
                )}
              </div>
            </div>

            <div className={g.bloque}>
              <h3>Por mes y tipo de servicio</h3>
              <BarrasApiladas
                datos={meses.map((m) => ({ mes: m.mes, valores: { grupal: m.grupal, individual: m.individual, online: m.online, otros: m.otros } }))}
                series={[
                  { id: "grupal", texto: "Grupales", color: COLOR_SERVICIO.grupal },
                  { id: "individual", texto: "Individuales", color: COLOR_SERVICIO.individual },
                  { id: "online", texto: "Online", color: COLOR_SERVICIO.online },
                  { id: "otros", texto: "Otros", color: COLOR_SERVICIO.otros },
                ]}
              />
            </div>

            <details>
              <summary className={styles.ayuda}>Ver la tabla con los importes de cada mes</summary>
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
            </details>
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
