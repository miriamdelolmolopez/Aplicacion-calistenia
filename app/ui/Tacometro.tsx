import estilos from "./clay.module.css";

// Tacómetro semicircular en SVG (arco terracota, 25 marcas de escala y aguja). Portado de charts.js del diseño.
// `porcentaje` va de 0 a 100.
export default function Tacometro({ porcentaje }: { porcentaje: number }) {
  const p = Math.min(100, Math.max(0, Math.round(porcentaje)));
  const ancho = 120;
  const alto = 75;
  const cx = 60;
  const cy = 68;
  const radio = 48;
  const totalMarcas = 25;
  const angulo = -90 + (p / 100) * 180;

  const marcas = Array.from({ length: totalMarcas + 1 }, (_, i) => {
    const grados = -180 + (i / totalMarcas) * 180;
    const rad = (grados * Math.PI) / 180;
    const mayor = i === 0 || i === Math.floor(totalMarcas / 2) || i === totalMarcas;
    const largo = mayor ? 7 : 4;
    return {
      i,
      x1: cx + (radio - largo) * Math.cos(rad),
      y1: cy + (radio - largo) * Math.sin(rad),
      x2: cx + radio * Math.cos(rad),
      y2: cy + radio * Math.sin(rad),
      color: i <= (p / 100) * totalMarcas ? "#DE5D35" : "#E2E2E6",
      grosor: mayor ? 1.5 : 1,
    };
  });

  const arco = `M ${cx - radio} ${cy} A ${radio} ${radio} 0 0 1 ${cx + radio} ${cy}`;
  const longitud = Math.PI * radio;

  return (
    <svg className={estilos.tacometro} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`${p}%`}>
      <path d={arco} fill="none" stroke="#F1F1F4" strokeWidth={4} strokeLinecap="round" />
      <path d={arco} fill="none" stroke="#DE5D35" strokeWidth={4} strokeLinecap="round" strokeDasharray={longitud} strokeDashoffset={longitud * (1 - p / 100)} />
      {marcas.map((m) => (
        <line key={m.i} x1={m.x1.toFixed(1)} y1={m.y1.toFixed(1)} x2={m.x2.toFixed(1)} y2={m.y2.toFixed(1)} stroke={m.color} strokeWidth={m.grosor} strokeLinecap="round" />
      ))}
      <text x={18} y={72} fontSize={7} fill="#8E8E93" fontWeight={600} textAnchor="middle">0%</text>
      <text x={cx} y={24} fontSize={7} fill="#8E8E93" fontWeight={600} textAnchor="middle">50%</text>
      <text x={102} y={72} fontSize={7} fill="#8E8E93" fontWeight={600} textAnchor="middle">100%</text>
      <g transform={`translate(${cx}, ${cy})`}>
        <g className={estilos.aguja} style={{ ["--angulo" as string]: `${angulo}deg` }}>
          <line x1={0} y1={0} x2={0} y2={-44} stroke="#DE5D35" strokeWidth={2.2} strokeLinecap="round" />
          <circle cx={0} cy={0} r={4.5} fill="#DE5D35" />
          <circle cx={0} cy={0} r={2} fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}
