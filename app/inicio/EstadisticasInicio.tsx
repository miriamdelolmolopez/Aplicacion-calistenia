"use client";

import { useEffect, useState } from "react";
import { claveDia } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { rangoDe } from "@/lib/periodos";
import { BarrasColores, Cambio, COLOR_SERVICIO, LineaMensual, PALETA, Rosca, TarjetaCifra } from "../admin/informes/GraficosPagos";
import { obtenerEstadisticas, type Estadisticas } from "./accionesEstadisticas";
import estilos from "./inicio.module.css";

type Opcion = "mes" | "tres" | "seis" | "fechas";
const OPCIONES: { id: Opcion; texto: string }[] = [
  { id: "mes", texto: "Este mes" },
  { id: "tres", texto: "Últimos 3 meses" },
  { id: "seis", texto: "Últimos 6 meses" },
  { id: "fechas", texto: "Elegir fechas" },
];
const SERVICIOS: Record<string, string> = { grupal: "Clases grupales", individual: "Individual", online: "Online", otros: "Otros" };
const EDADES: [string, string][] = [
  ["menos_18", "Menos de 18"],
  ["de_18_a_25", "18 a 25"],
  ["de_26_a_35", "26 a 35"],
  ["de_36_a_45", "36 a 45"],
  ["de_46_a_55", "46 a 55"],
  ["mas_55", "Más de 55"],
  ["sin_dato", "Sin fecha"],
];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function rangoSeisMeses(hoy: string): { desde: string; hasta: string } {
  const a = Number(hoy.slice(0, 4));
  const m = Number(hoy.slice(5, 7));
  const d = new Date(Date.UTC(a, m - 6, 1));
  return { desde: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`, hasta: rangoDe("mes", hoy).hasta };
}

// Estadísticas del Inicio: cifras y gráficos del periodo que se elija (este mes, 3 o 6 meses, o entre dos fechas).
export default function EstadisticasInicio() {
  const hoy = claveDia(new Date().toISOString());
  const [opcion, setOpcion] = useState<Opcion>("mes");
  const [desde, setDesde] = useState(hoy.slice(0, 7) + "-01");
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true);

  const rango =
    opcion === "mes" ? rangoDe("mes", hoy) : opcion === "tres" ? rangoDe("trimestre", hoy) : opcion === "seis" ? rangoSeisMeses(hoy) : { desde, hasta };
  const valido = rango.desde <= rango.hasta && FECHA.test(rango.desde) && FECHA.test(rango.hasta);

  useEffect(() => {
    if (!valido) return;
    let vigente = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    obtenerEstadisticas(rango.desde, rango.hasta)
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setDatos(null))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [rango.desde, rango.hasta, valido]);

  const i = datos?.i;
  const a = datos?.atletas;
  const conv = i && i.conversion.pruebas > 0 ? Math.round((i.conversion.convertidas / i.conversion.pruebas) * 100) : null;

  return (
    <section className={estilos.estadisticas} aria-label="Estadísticas">
      <div className={estilos.estadCabecera}>
        <h2 className={estilos.resumenSeccion} style={{ margin: 0 }}>
          Estadísticas
        </h2>
        <div className={estilos.periodos} role="tablist" aria-label="Periodo">
          {OPCIONES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={opcion === o.id}
              className={`${estilos.periodo} ${opcion === o.id ? estilos.periodoActivo : ""}`}
              onClick={() => setOpcion(o.id)}
            >
              {o.texto}
            </button>
          ))}
        </div>
      </div>

      {opcion === "fechas" && (
        <div className={estilos.fechasFila}>
          <label>
            Desde
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      )}
      {!valido && <p className={estilos.resumenVacio}>Elige un «desde» anterior al «hasta».</p>}

      {valido && !datos && <p className={estilos.resumenVacio}>{cargando ? "Cargando estadísticas…" : "No se han podido cargar las estadísticas."}</p>}

      {valido && i && a && (
        <div className={estilos.estadContenido} style={{ opacity: cargando ? 0.55 : 1 }}>
          <div className={estilos.estadCifras}>
            <TarjetaCifra
              titulo="Cobrado"
              valor={euros(i.ingresos.total_periodo)}
              color="#0aa8c0"
              notas={
                <>
                  <span>{i.ingresos.pagos_periodo} pagos</span>
                  <Cambio actual={i.ingresos.total_periodo} antes={i.ingresos.total_periodo_anterior} etiqueta="vs periodo anterior" />
                </>
              }
            />
            <TarjetaCifra
              titulo="Pago medio"
              valor={euros(i.ingresos.pagos_periodo > 0 ? Math.round(i.ingresos.total_periodo / i.ingresos.pagos_periodo) : 0)}
              color="#2fb57a"
              notas={<span>Importe medio de cada pago</span>}
            />
            <TarjetaCifra titulo="Pendiente de cobro" valor={euros(i.ingresos.pendiente_cobro)} color="#f5a524" notas={<span>Descuentos: {euros(i.ingresos.descuentos_periodo)}</span>} />
            <TarjetaCifra titulo="Altas nuevas" valor={String(a.nuevos)} color="#6d5efc" notas={<span>{a.pruebas} han probado una clase</span>} />
            <TarjetaCifra
              titulo="Conversión de pruebas"
              valor={conv === null ? "—" : `${conv} %`}
              color="#8b7cf6"
              notas={
                <span>
                  {i.conversion.convertidas} de {i.conversion.pruebas} se apuntaron
                </span>
              }
            />
            <TarjetaCifra titulo="Perdidas" valor={String(a.perdidas)} color="#ef5f8b" notas={<span>No renovaron su bono</span>} />
            <TarjetaCifra
              titulo="Retención"
              valor={a.retencion ? `${Math.round((a.retencion.siguen / a.retencion.base) * 100)} %` : "—"}
              color="#0e7490"
              notas={<span>{a.retencion ? `${a.retencion.siguen} de ${a.retencion.base} siguen` : "Sin alumnos/as al empezar"}</span>}
            />
            <TarjetaCifra titulo="Ausencias" valor={String(a.totalAusencias)} color="#94a3b8" notas={<span>No se presentaron a su clase</span>} />
          </div>

          <div className={estilos.graficos}>
            <div className={estilos.graficoTarjeta}>
              <h3>Ingresos mes a mes</h3>
              <LineaMensual datos={i.ingresos.mensual.map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))} />
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Altas mes a mes</h3>
              <LineaMensual formato={String} entero datos={i.altas_mensuales.map((m) => ({ mes: m.mes, total: m.altas }))} />
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Ingresos por tipo de servicio</h3>
              {i.ingresos.por_servicio.length === 0 ? (
                <p className={estilos.resumenVacio}>No hay cobros en este periodo.</p>
              ) : (
                <Rosca
                  total={i.ingresos.total_periodo}
                  filas={i.ingresos.por_servicio.map((m) => ({ texto: SERVICIOS[m.servicio] ?? m.servicio, valor: m.total, color: COLOR_SERVICIO[m.servicio] ?? COLOR_SERVICIO.otros }))}
                />
              )}
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Alumnos/as por tipo de servicio</h3>
              <Rosca
                formato={String}
                total={i.por_servicio.grupal + i.por_servicio.individual + i.por_servicio.online}
                centro={String(i.por_servicio.grupal + i.por_servicio.individual + i.por_servicio.online)}
                subtitulo="servicios"
                filas={[
                  { texto: "Clases grupales", valor: i.por_servicio.grupal, color: COLOR_SERVICIO.grupal },
                  { texto: "Individuales", valor: i.por_servicio.individual, color: COLOR_SERVICIO.individual },
                  { texto: "Online", valor: i.por_servicio.online, color: COLOR_SERVICIO.online },
                  { texto: "Sin servicio", valor: i.por_servicio.sin_servicio, color: COLOR_SERVICIO.otros },
                ]}
              />
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Método de pago</h3>
              {i.ingresos.por_metodo.length === 0 ? (
                <p className={estilos.resumenVacio}>No hay cobros en este periodo.</p>
              ) : (
                <BarrasColores filas={i.ingresos.por_metodo.map((m, n) => ({ texto: datos?.metodos[m.metodo] ?? m.metodo, valor: m.total, color: PALETA[n % PALETA.length] }))} />
              )}
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Tarifas más contratadas</h3>
              {i.tarifas.length === 0 ? (
                <p className={estilos.resumenVacio}>Todavía no hay datos.</p>
              ) : (
                <BarrasColores formato={(n) => `${n} ${n === 1 ? "vez" : "veces"}`} filas={i.tarifas.map((t, n) => ({ texto: t.nombre, valor: t.contratadas, color: PALETA[n % PALETA.length] }))} />
              )}
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Ocupación de las clases</h3>
              {a.ocupacion.length === 0 ? (
                <p className={estilos.resumenVacio}>Sin clases en este periodo.</p>
              ) : (
                <BarrasColores porcentaje={false} formato={(n) => `${n} %`} filas={a.ocupacion.map((f, n) => ({ texto: f.texto, valor: f.valor, color: PALETA[n % PALETA.length] }))} />
              )}
            </div>
            <div className={estilos.graficoTarjeta}>
              <h3>Alumnos/as por edad</h3>
              <BarrasColores formato={String} filas={EDADES.map(([k, texto], n) => ({ texto, valor: i.por_edad[k] ?? 0, color: PALETA[n % PALETA.length] }))} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
