import { fechaCorta } from "@/lib/fechas";

// Gráfica de línea sencilla: un punto por fecha.
export default function GraficaLinea({
  puntos,
  unidad,
  idioma,
}: {
  puntos: { fecha: string; valor: number }[];
  unidad: string;
  idioma: "es" | "en";
}) {
  if (puntos.length === 0) return null;
  const W = 320;
  const H = 170;
  const izq = 38;
  const der = 10;
  const arriba = 14;
  const abajo = 26;
  const minimo = Math.min(...puntos.map((p) => p.valor));
  const maximo = Math.max(...puntos.map((p) => p.valor));
  const margen = Math.max((maximo - minimo) * 0.2, maximo * 0.02, 0.5);
  const bajo = minimo - margen;
  const alto = maximo + margen;
  const x = (i: number) => (puntos.length === 1 ? (izq + W - der) / 2 : izq + (i * (W - izq - der)) / (puntos.length - 1));
  const y = (v: number) => arriba + (1 - (v - bajo) / (alto - bajo)) * (H - arriba - abajo);
  // Línea suave (curvas) y un relleno que se desvanece por debajo
  const pts = puntos.map((p, i) => [x(i), y(p.valor)] as const);
  const camino = pts
    .map(([px, py], i) => {
      if (i === 0) return `M${px.toFixed(1)} ${py.toFixed(1)}`;
      const [qx, qy] = pts[i - 1];
      const cx = ((qx + px) / 2).toFixed(1);
      return `C${cx} ${qy.toFixed(1)} ${cx} ${py.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
  const base = H - abajo;
  const area = `${camino} L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img">
      <defs>
        <linearGradient id="relleno-linea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0aa8c0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0aa8c0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[bajo, (bajo + alto) / 2, alto].map((v) => (
        <g key={v}>
          <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="#e4e1dc" />
          <text x={izq - 4} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#6b6e75">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      {puntos.length > 1 && <path d={area} fill="url(#relleno-linea)" />}
      <path d={camino} fill="none" stroke="#0aa8c0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* El último punto late suavemente */}
      <circle cx={x(puntos.length - 1)} cy={y(puntos[puntos.length - 1].valor)} r={4} fill="none" stroke="#0aa8c0" strokeWidth={2}>
        <animate attributeName="r" values="4;12" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0" dur="2s" repeatCount="indefinite" />
      </circle>
      {puntos.map((p, i) => (
        <circle key={p.fecha} cx={x(i)} cy={y(p.valor)} r={4} fill="#ffffff" stroke="#0aa8c0" strokeWidth={2.5}>
          <title>{`${fechaCorta(p.fecha, idioma)}: ${p.valor} ${unidad}`}</title>
        </circle>
      ))}
      <text x={izq} y={H - 8} fontSize="10" fill="#6b6e75">
        {fechaCorta(puntos[0].fecha, idioma)}
      </text>
      {puntos.length > 1 && (
        <text x={W - der} y={H - 8} fontSize="10" textAnchor="end" fill="#6b6e75">
          {fechaCorta(puntos[puntos.length - 1].fecha, idioma)}
        </text>
      )}
    </svg>
  );
}
