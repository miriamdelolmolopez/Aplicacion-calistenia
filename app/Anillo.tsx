// Indicador circular: cuánto queda (valor) de un total, con la cifra en monoespaciada en el centro.
export default function Anillo({ valor, total, tamano = 92 }: { valor: number; total: number; tamano?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const parte = total > 0 ? Math.min(1, Math.max(0, valor / total)) : 0;
  return (
    <div style={{ position: "relative", width: tamano, height: tamano, flexShrink: 0 }} role="img" aria-label={`${valor} / ${total}`}>
      <svg viewBox="0 0 100 100" width={tamano} height={tamano} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#ecebe7" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e8602c"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - parte)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", lineHeight: 1 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: tamano * 0.3, fontWeight: 500, letterSpacing: "-0.04em" }}>{valor}</div>
          <div style={{ marginTop: 3, fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: tamano * 0.12, color: "#6b6e75" }}>/ {total}</div>
        </div>
      </div>
    </div>
  );
}
