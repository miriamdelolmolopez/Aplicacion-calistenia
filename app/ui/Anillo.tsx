import estilos from "./clay.module.css";

// Anillo de progreso en SVG: pista gris clara y un arco turquesa que se dibuja de 0 al porcentaje.
// `porcentaje` va de 0 a 100.
export default function Anillo({ porcentaje }: { porcentaje: number }) {
  const p = Math.min(100, Math.max(0, Math.round(porcentaje)));
  const radio = 40;
  const longitud = 2 * Math.PI * radio;

  return (
    <svg className={estilos.anillo} viewBox="0 0 100 100" role="img" aria-label={`${p}%`}>
      <circle cx={50} cy={50} r={radio} fill="none" stroke="#E6E6EA" strokeWidth={8} />
      <circle
        className={estilos.anilloArco}
        cx={50}
        cy={50}
        r={radio}
        fill="none"
        stroke="#0d9488"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={longitud}
        strokeDashoffset={longitud * (1 - p / 100)}
        transform="rotate(-90 50 50)"
        style={{ ["--longitud" as string]: longitud }}
      />
    </svg>
  );
}
