/* eslint-disable @next/next/no-img-element */
// Foto de la persona (en círculo) o, si no tiene, sus iniciales.
export default function Avatar({
  nombre,
  url,
  tamano = 72,
}: {
  nombre: string;
  url?: string | null;
  tamano?: number;
}) {
  const iniciales =
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "·";

  // Color según el nombre (siempre el mismo para la misma persona): terracota y neutros cálidos
  const COLORES = ["#0aa8c0", "#17181a", "#0e7490", "#8a6f5a", "#5b6770"];
  const color = COLORES[[...nombre].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];

  const caja: React.CSSProperties = {
    width: tamano,
    height: tamano,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
  };

  return url ? (
    <img src={url} alt="" style={{ ...caja, objectFit: "cover" }} />
  ) : (
    <span
      aria-hidden="true"
      style={{
        ...caja,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: color,
        color: "#fff",
        fontWeight: 600,
        fontSize: tamano * 0.38,
      }}
    >
      {iniciales}
    </span>
  );
}
