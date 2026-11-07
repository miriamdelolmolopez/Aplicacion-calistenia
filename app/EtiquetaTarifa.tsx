import type { EtiquetaT } from "@/lib/estadoTarifa";

const COLORES = {
  verde: { fondo: "#e3efd9", texto: "#2f5d1c" },
  naranja: { fondo: "#fde9d2", texto: "#9a4d00" },
  gris: { fondo: "#e8e6e1", texto: "#5f5e5a" },
} as const;

// La pastilla de color de una tarifa (estado o pago). Sirve igual en pantallas de servidor y de cliente.
export default function EtiquetaTarifa({ e }: { e: EtiquetaT | null }) {
  if (!e) return null;
  const c = COLORES[e.tono];
  return (
    <span
      style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, background: c.fondo, color: c.texto, whiteSpace: "nowrap", marginRight: 6 }}
    >
      {e.texto}
    </span>
  );
}
