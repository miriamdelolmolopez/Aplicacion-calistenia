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
  const camino = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img">
      {[bajo, (bajo + alto) / 2, alto].map((v) => (
        <g key={v}>
          <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="#e3dccd" />
          <text x={izq - 4} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#5a5e3b">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      <path d={camino} fill="none" stroke="#70754b" strokeWidth={2.5} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle key={p.fecha} cx={x(i)} cy={y(p.valor)} r={4} fill="#70754b">
          <title>{`${fechaCorta(p.fecha, idioma)}: ${p.valor} ${unidad}`}</title>
        </circle>
      ))}
      <text x={izq} y={H - 8} fontSize="10" fill="#5a5e3b">
        {fechaCorta(puntos[0].fecha, idioma)}
      </text>
      {puntos.length > 1 && (
        <text x={W - der} y={H - 8} fontSize="10" textAnchor="end" fill="#5a5e3b">
          {fechaCorta(puntos[puntos.length - 1].fecha, idioma)}
        </text>
      )}
    </svg>
  );
}
