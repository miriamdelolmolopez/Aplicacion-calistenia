"use client";

import Model, { type Muscle } from "react-body-highlighter";
import { MUSCULOS } from "@/lib/ejercicios";
import styles from "./MapaCorporal.module.css";

// De más suave a más intenso (verde oliva de tu marca).
const COLORES = ["#e3f5f2", "#bcc48f", "#2dd4bf", "#0d9488", "#3f4326"];

// Cuerpo humano en blanco y negro, de frente y de espalda, con los músculos
// trabajados resaltados en color. La intensidad va de 1 (suave) a 5 (fuerte).
export default function MapaCorporal({
  intensidades,
  etiquetas = { frente: "Frente", espalda: "Espalda" },
}: {
  intensidades: Record<string, number>;
  etiquetas?: { frente: string; espalda: string };
}) {
  const data = MUSCULOS.filter((m) => (intensidades[m.valor] ?? 0) > 0).map((m) => ({
    name: m.valor,
    muscles: [m.lib as Muscle],
    frequency: Math.min(5, Math.max(1, Math.round(intensidades[m.valor]))),
  }));

  return (
    <div className={styles.mapa} role="img" aria-label="Mapa de músculos trabajados">
      <figure className={styles.vista}>
        <Model type="anterior" data={data} bodyColor="#f4f4f4" highlightedColors={COLORES} />
        <figcaption>{etiquetas.frente}</figcaption>
      </figure>
      <figure className={styles.vista}>
        <Model type="posterior" data={data} bodyColor="#f4f4f4" highlightedColors={COLORES} />
        <figcaption>{etiquetas.espalda}</figcaption>
      </figure>
    </div>
  );
}
