// Gráficos de colores para el informe de pagos (SVG dibujado en el servidor, sin JavaScript).
import { euros } from "@/lib/formato";
import { nombreMes } from "../estadisticas/Graficos";
import estilos from "./informes.module.css";

export const PALETA = ["#0aa8c0", "#6d5efc", "#f5a524", "#ef5f8b", "#2fb57a", "#94a3b8"];
export const COLOR_SERVICIO: Record<string, string> = { grupal: "#0aa8c0", individual: "#6d5efc", online: "#f5a524", otros: "#94a3b8" };

const corto = (centimos: number) => {
  const e = centimos / 100;
  return e >= 1000 ? `${(e / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} k€` : `${Math.round(e)} €`;
};

// Un máximo «redondo» para que las líneas de la cuadrícula salgan en cifras bonitas.
function techo(maximo: number): number {
  if (maximo <= 0) return 100;
  const base = Math.pow(10, Math.floor(Math.log10(maximo)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) if (m * base >= maximo) return m * base;
  return maximo;
}

// Tarjeta con una cifra grande, de color y con su subida o bajada.
export function TarjetaCifra({
  titulo,
  valor,
  color,
  notas,
}: {
  titulo: string;
  valor: string;
  color: string;
  notas: React.ReactNode;
}) {
  return (
    <div className={estilos.tarjetaCifra} style={{ "--color": color } as React.CSSProperties}>
      <span className={estilos.tarjetaTitulo}>{titulo}</span>
      <strong>{valor}</strong>
      <div className={estilos.tarjetaNotas}>{notas}</div>
    </div>
  );
}

// Subida o bajada respecto a otro periodo, con una etiqueta de color.
export function Cambio({ actual, antes, etiqueta }: { actual: number; antes: number; etiqueta: string }) {
  if (antes === 0) return <span className={estilos.neutro}>{etiqueta}: sin datos</span>;
  const pct = Math.round(((actual - antes) / antes) * 100);
  return (
    <span className={pct >= 0 ? estilos.sube : estilos.baja}>
      {pct >= 0 ? "▲ +" : "▼ "}
      {pct} % <small>{etiqueta}</small>
    </span>
  );
}

// Rosca con el total en el centro y la leyenda al lado.
export function Rosca({
  filas,
  total,
  formato = euros,
  centro,
  subtitulo = "total",
}: {
  filas: { texto: string; valor: number; color: string }[];
  total: number;
  formato?: (n: number) => string;
  centro?: string;
  subtitulo?: string;
}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const suma = filas.reduce((s, f) => s + f.valor, 0) || 1;
  let acumulado = 0;
  return (
    <div className={estilos.rosca}>
      <svg viewBox="0 0 120 120" role="img" aria-label="Reparto" className={estilos.roscaSvg}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--relleno)" strokeWidth="16" />
        {filas
          .filter((f) => f.valor > 0)
          .map((f) => {
            const largo = (f.valor / suma) * C;
            const desfase = -acumulado;
            acumulado += largo;
            return (
              <circle
                key={f.texto}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={f.color}
                strokeWidth="16"
                strokeDasharray={`${Math.max(largo - 1.5, 0.5)} ${C - Math.max(largo - 1.5, 0.5)}`}
                strokeDashoffset={desfase}
                transform="rotate(-90 60 60)"
              >
                <title>{`${f.texto}: ${formato(f.valor)} (${Math.round((f.valor / suma) * 100)} %)`}</title>
              </circle>
            );
          })}
        <text x="60" y="58" textAnchor="middle" className={estilos.roscaTotal}>
          {centro ?? corto(total)}
        </text>
        <text x="60" y="73" textAnchor="middle" className={estilos.roscaSub}>
          {subtitulo}
        </text>
      </svg>
      <ul className={estilos.leyenda}>
        {filas.map((f) => (
          <li key={f.texto}>
            <i style={{ background: f.color }} />
            <span>{f.texto}</span>
            <strong>{formato(f.valor)}</strong>
            <small>{Math.round((f.valor / suma) * 100)} %</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

const W = 640;
const H = 240;
const IZQ = 48;
const DER = 12;
const ARR = 14;
const ABA = 28;

// Líneas y cuadrícula de fondo comunes a los gráficos por mes.
function Cuadricula({ maximo, etiqueta = corto }: { maximo: number; etiqueta?: (n: number) => string }) {
  const lineas = [0, 1, 2, 3, 4];
  return (
    <>
      {lineas.map((n) => {
        const y = ARR + ((H - ARR - ABA) * n) / 4;
        return (
          <g key={n}>
            <line x1={IZQ} x2={W - DER} y1={y} y2={y} className={estilos.rejilla} />
            <text x={IZQ - 8} y={y + 4} textAnchor="end" className={estilos.eje}>
              {etiqueta(maximo * (1 - n / 4))}
            </text>
          </g>
        );
      })}
    </>
  );
}

// Línea de ingresos mes a mes, con el mismo mes del año anterior punteado.
export function LineaMensual({
  datos,
  formato = euros,
  entero = false,
}: {
  datos: { mes: string; total: number; anterior?: number }[];
  formato?: (n: number) => string;
  entero?: boolean; // recuentos: la escala siempre en números enteros
}) {
  const maximo = techo(Math.max(...datos.flatMap((d) => [d.total, d.anterior ?? 0]), entero ? 4 : 1));
  const hayAnterior = datos.some((d) => d.anterior !== undefined);
  const anchoUtil = W - IZQ - DER;
  const altoUtil = H - ARR - ABA;
  const x = (i: number) => IZQ + (datos.length > 1 ? (anchoUtil * i) / (datos.length - 1) : anchoUtil / 2);
  const y = (v: number) => ARR + altoUtil * (1 - v / maximo);
  const linea = (f: (d: (typeof datos)[number]) => number) => datos.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(f(d)).toFixed(1)}`).join(" ");
  const area = `${linea((d) => d.total)} L${x(datos.length - 1).toFixed(1)} ${ARR + altoUtil} L${x(0).toFixed(1)} ${ARR + altoUtil} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución mes a mes" className={estilos.grafico}>
      <defs>
        <linearGradient id="areaIngresos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0aa8c0" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#0aa8c0" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <Cuadricula maximo={maximo} etiqueta={entero ? (n) => String(Math.round(n)) : undefined} />
      {hayAnterior && <path d={linea((d) => d.anterior ?? 0)} className={estilos.lineaAnterior} />}
      <path d={area} fill="url(#areaIngresos)" />
      <path d={linea((d) => d.total)} className={estilos.lineaActual} />
      {datos.map((d, i) => (
        <g key={d.mes}>
          <circle cx={x(i)} cy={y(d.total)} r="4.5" className={estilos.punto}>
            <title>{`${nombreMes(d.mes)}: ${formato(d.total)}${d.anterior !== undefined ? ` (año anterior: ${formato(d.anterior)})` : ""}`}</title>
          </circle>
          <text x={x(i)} y={H - 8} textAnchor="middle" className={estilos.eje}>
            {nombreMes(d.mes).slice(0, 3)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Barras por mes divididas por tipo de servicio (cada color es un servicio).
export function BarrasApiladas({
  datos,
  series,
}: {
  datos: { mes: string; valores: Record<string, number> }[];
  series: { id: string; texto: string; color: string }[];
}) {
  const totales = datos.map((d) => series.reduce((s, x) => s + (d.valores[x.id] ?? 0), 0));
  const maximo = techo(Math.max(...totales, 1));
  const anchoUtil = W - IZQ - DER;
  const altoUtil = H - ARR - ABA;
  const paso = anchoUtil / datos.length;
  const ancho = Math.min(34, paso * 0.62);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ingresos por mes y servicio" className={estilos.grafico}>
        <Cuadricula maximo={maximo} />
        {datos.map((d, i) => {
          let base = ARR + altoUtil;
          const cx = IZQ + paso * i + paso / 2;
          return (
            <g key={d.mes}>
              {series.map((s) => {
                const v = d.valores[s.id] ?? 0;
                if (v <= 0) return null;
                const alto = (v / maximo) * altoUtil;
                base -= alto;
                return (
                  <rect key={s.id} x={cx - ancho / 2} y={base} width={ancho} height={Math.max(alto, 1)} rx="3" fill={s.color}>
                    <title>{`${nombreMes(d.mes)} · ${s.texto}: ${euros(v)}`}</title>
                  </rect>
                );
              })}
              <text x={cx} y={H - 8} textAnchor="middle" className={estilos.eje}>
                {nombreMes(d.mes).slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className={estilos.leyendaFila}>
        {series.map((s) => (
          <li key={s.id}>
            <i style={{ background: s.color }} />
            {s.texto}
          </li>
        ))}
      </ul>
    </>
  );
}

// Barras horizontales de colores (una por fila), con el importe y el porcentaje.
export function BarrasColores({ filas, formato = euros, porcentaje = true }: { filas: { texto: string; valor: number; color: string }[]; formato?: (n: number) => string; porcentaje?: boolean }) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  const suma = filas.reduce((s, f) => s + f.valor, 0) || 1;
  return (
    <ul className={estilos.barrasColores}>
      {filas.map((f) => (
        <li key={f.texto}>
          <div>
            <span>{f.texto}</span>
            <strong>
              {formato(f.valor)}
              {porcentaje && (
                <>
                  {" "}
                  <small>{Math.round((f.valor / suma) * 100)} %</small>
                </>
              )}
            </strong>
          </div>
          <div className={estilos.pistaColor}>
            <div style={{ width: `${(f.valor / maximo) * 100}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color}bb)` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
