// Gráficos sencillos para los informes (se dibujan en el servidor, sin JavaScript).
import estilos from "./estadisticas.module.css";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const nombreMes = (mes: string) => `${MESES[Number(mes.slice(5)) - 1]} ${mes.slice(2, 4)}`;

// Barras horizontales: una por fila con su número.
export function BarrasHorizontales({
  filas,
  formato = (n) => String(n),
}: {
  filas: { texto: string; valor: number; detalle?: string }[];
  formato?: (n: number) => string;
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className={estilos.horizontales}>
      {filas.map((f) => (
        <li key={f.texto}>
          <div className={estilos.horizontalCab}>
            <span>{f.texto}</span>
            <strong>{formato(f.valor)}</strong>
          </div>
          <div className={estilos.pista}>
            <div className={estilos.relleno} style={{ width: `${(f.valor / maximo) * 100}%` }} />
          </div>
          {f.detalle && <small>{f.detalle}</small>}
        </li>
      ))}
    </ul>
  );
}

// Barras por mes, con el mismo mes del año anterior en un tono más claro.
export function BarrasMensuales({
  datos,
  formato,
}: {
  datos: { mes: string; total: number; anterior?: number }[];
  formato: (n: number) => string;
}) {
  const maximo = Math.max(1, ...datos.flatMap((d) => [d.total, d.anterior ?? 0]));
  return (
    <div className={estilos.mensuales} role="img" aria-label="Gráfico por meses">
      {datos.map((d) => (
        <div key={d.mes} className={estilos.mes} title={`${nombreMes(d.mes)}: ${formato(d.total)}${d.anterior !== undefined ? ` (año anterior: ${formato(d.anterior)})` : ""}`}>
          <div className={estilos.columnas}>
            {d.anterior !== undefined && (
              <div className={estilos.barraAnterior} style={{ height: `${(d.anterior / maximo) * 100}%` }} />
            )}
            <div className={estilos.barra} style={{ height: `${(d.total / maximo) * 100}%` }} />
          </div>
          <span>{nombreMes(d.mes).slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}
