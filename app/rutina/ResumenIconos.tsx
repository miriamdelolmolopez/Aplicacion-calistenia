import MapaCorporal from "../MapaCorporal";
import styles from "../formularios.module.css";

export type DatoResumen = { icono: string; valor: string; texto: string };

// Resumen con iconos: números, tipos de ejercicio, material y músculos trabajados.
export default function ResumenIconos({
  datos,
  tipos = [],
  materiales = [],
  intensidades,
  idioma,
}: {
  datos: DatoResumen[];
  tipos?: string[];
  materiales?: string[];
  intensidades?: Record<string, number>;
  idioma: "es" | "en";
}) {
  const en = idioma === "en";
  const etiqueta = (t: string) => (
    <span key={t} style={{ padding: "4px 12px", fontSize: "0.85rem", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 999 }}>
      {t}
    </span>
  );
  return (
    <section className={styles.tarjeta} style={{ marginBottom: 14, gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {datos.map((d) => (
          <div key={d.texto} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--relleno)", borderRadius: 16 }}>
            <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>
              {d.icono}
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <strong>{d.valor}</strong>
              <small style={{ color: "var(--secundario)" }}>{d.texto}</small>
            </span>
          </div>
        ))}
      </div>
      {tipos.length > 0 && (
        <div>
          <strong>🏷 {en ? "Type of work" : "Tipo de trabajo"}</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{tipos.map(etiqueta)}</div>
        </div>
      )}
      <div>
        <strong>🧰 {en ? "Equipment" : "Material"}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {materiales.length === 0 ? <span className={styles.ayuda}>{en ? "None" : "Ninguno"}</span> : materiales.map(etiqueta)}
        </div>
      </div>
      {intensidades && Object.keys(intensidades).length > 0 && (
        <div>
          <strong>💪 {en ? "Muscles worked" : "Músculos trabajados"}</strong>
          <MapaCorporal intensidades={intensidades} etiquetas={{ frente: en ? "Front" : "Frente", espalda: en ? "Back" : "Espalda" }} />
        </div>
      )}
    </section>
  );
}
