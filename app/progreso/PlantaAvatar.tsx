// Avatar de la alumna: una planta que crece con los entrenos y se marchita si deja de entrenar.
// nivel 1..6 · marchita 0 (sana), 1 (más de 5 días sin entrenar), 2 (más de 14) · brillante = racha en marcha.

const VERDE = ["#0d9488", "#2dd4bf"];
const SECO1 = ["#a49a57", "#bfae6a"];
const SECO2 = ["#8a6f4e", "#a08560"];
const TRONCO = "#7a5f43";
const TIERRA = "#6b5a46";

function hoja(x: number, y: number, grados: number, tam: number, color: string, clave: string) {
  const r = (grados * Math.PI) / 180;
  const cx = x + Math.cos(r) * tam;
  const cy = y + Math.sin(r) * tam;
  return (
    <ellipse
      key={clave}
      cx={cx}
      cy={cy}
      rx={tam}
      ry={tam * 0.45}
      fill={color}
      transform={`rotate(${grados} ${cx} ${cy})`}
    />
  );
}

function estrella(x: number, y: number, tam: number, clave: string) {
  return (
    <path
      key={clave}
      d={`M${x} ${y - tam} L${x + tam * 0.3} ${y - tam * 0.3} L${x + tam} ${y} L${x + tam * 0.3} ${y + tam * 0.3} L${x} ${y + tam} L${x - tam * 0.3} ${y + tam * 0.3} L${x - tam} ${y} L${x - tam * 0.3} ${y - tam * 0.3} Z`}
      fill="#f0b429"
    />
  );
}

export default function PlantaAvatar({
  nivel,
  marchita = 0,
  brillante = false,
  tamano = 200,
  titulo,
}: {
  nivel: number;
  marchita?: number;
  brillante?: boolean;
  tamano?: number;
  titulo?: string;
}) {
  const paleta = marchita >= 2 ? SECO2 : marchita === 1 ? SECO1 : VERDE;
  const [oscuro, claro] = paleta;
  // Al marchitarse la planta se inclina y se "encoge" un poco, y las hojas caen.
  const inclinacion = marchita === 0 ? 0 : marchita === 1 ? 9 : 18;
  const encoger = marchita === 0 ? 1 : marchita === 1 ? 0.94 : 0.86;
  const caida = marchita === 0 ? 0 : marchita === 1 ? 22 : 45;
  const base = { x: 100, y: 190 };

  const partes: React.ReactNode[] = [];

  if (nivel <= 1) {
    partes.push(
      <ellipse key="semilla" cx={100} cy={184} rx={11} ry={7} fill="#8a6b4a" />,
      <path key="raya" d="M93 184 Q100 180 107 184" stroke="#115e59" strokeWidth={2} fill="none" />,
    );
  } else if (nivel === 2) {
    partes.push(
      <path key="tallo" d={`M100 190 L100 150`} stroke={oscuro} strokeWidth={4} strokeLinecap="round" />,
      hoja(100, 152, -150 + caida, 20, claro, "h1"),
      hoja(100, 152, -30 - caida, 20, oscuro, "h2"),
    );
  } else if (nivel === 3) {
    partes.push(
      <path key="tallo" d="M100 190 L100 110" stroke={oscuro} strokeWidth={5} strokeLinecap="round" />,
      hoja(100, 160, -160 + caida, 24, claro, "h1"),
      hoja(100, 160, -20 - caida, 24, oscuro, "h2"),
      hoja(100, 132, -150 + caida, 26, oscuro, "h3"),
      hoja(100, 132, -30 - caida, 26, claro, "h4"),
      hoja(100, 112, -100, 20, claro, "h5"),
    );
  } else if (nivel === 4) {
    const tallos = [-28, 0, 28];
    for (const [i, dx] of tallos.entries()) {
      const tope = 90 + Math.abs(dx) * 0.7;
      partes.push(
        <path key={`t${i}`} d={`M100 190 Q${100 + dx / 2} 150 ${100 + dx} ${tope}`} stroke={oscuro} strokeWidth={4} fill="none" strokeLinecap="round" />,
        hoja(100 + dx, tope + 40, -160 + caida, 24, i % 2 ? claro : oscuro, `a${i}`),
        hoja(100 + dx, tope + 40, -20 - caida, 24, i % 2 ? oscuro : claro, `b${i}`),
        hoja(100 + dx, tope + 15, -150 + caida, 24, claro, `c${i}`),
        hoja(100 + dx, tope + 15, -30 - caida, 24, oscuro, `d${i}`),
        hoja(100 + dx, tope - 2, -90, 20, claro, `e${i}`),
      );
    }
  } else {
    const copa: [number, number, number][] =
      nivel === 5
        ? [
            [100, 80, 34],
            [75, 98, 26],
            [125, 98, 26],
          ]
        : [
            [100, 62, 40],
            [66, 90, 32],
            [134, 90, 32],
            [82, 62, 28],
            [118, 62, 28],
          ];
    partes.push(
      <path
        key="tronco"
        d={`M92 190 L96 ${nivel === 5 ? 110 : 95} L104 ${nivel === 5 ? 110 : 95} L108 190 Z`}
        fill={marchita ? "#115e59" : TRONCO}
      />,
      ...copa.map(([x, y, r], i) => (
        <circle key={`c${i}`} cx={x} cy={y + caida / 6} r={r} fill={i % 2 ? claro : oscuro} />
      )),
    );
    if (nivel === 6 && marchita === 0) {
      for (const [i, [x, y]] of (
        [
          [78, 70],
          [100, 48],
          [124, 72],
          [62, 94],
          [138, 94],
          [100, 80],
        ] as [number, number][]
      ).entries()) {
        partes.push(
          <g key={`f${i}`}>
            <circle cx={x} cy={y} r={6} fill="#f2c9cf" />
            <circle cx={x} cy={y} r={2.5} fill="#f0b429" />
          </g>,
        );
      }
    }
  }

  const hojasCaidas =
    marchita >= 1 && nivel >= 2 ? (
      <>
        <ellipse cx={78} cy={196} rx={9} ry={4} fill={claro} transform="rotate(-12 78 196)" />
        {marchita >= 2 && <ellipse cx={126} cy={197} rx={9} ry={4} fill={oscuro} transform="rotate(14 126 197)" />}
        {marchita >= 2 && <ellipse cx={98} cy={200} rx={7} ry={3.5} fill={claro} transform="rotate(4 98 200)" />}
      </>
    ) : null;

  return (
    <svg
      viewBox="0 0 200 220"
      width={tamano}
      height={(tamano * 220) / 200}
      role="img"
      aria-label={titulo}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      {titulo && <title>{titulo}</title>}
      <ellipse cx={100} cy={198} rx={58} ry={14} fill={TIERRA} />
      <ellipse cx={100} cy={195} rx={50} ry={10} fill="#7d6a53" />
      {hojasCaidas}
      <g transform={`rotate(${inclinacion} ${base.x} ${base.y}) translate(${base.x} ${base.y}) scale(1 ${encoger}) translate(${-base.x} ${-base.y})`}>
        {partes}
      </g>
      {brillante && marchita === 0 && nivel >= 2 && (
        <>
          {estrella(52, 80, 7, "s1")}
          {estrella(150, 60, 9, "s2")}
          {estrella(160, 120, 6, "s3")}
          {estrella(44, 135, 6, "s4")}
        </>
      )}
    </svg>
  );
}
