"use client";

import styles from "./admin.module.css";

export type OpcionMulti = { valor: string; etiqueta: string };

// Desplegable donde se marcan varias opciones. Las elegidas se ven como etiquetas
// en el botón y se pueden quitar volviendo a marcarlas.
export default function MultiDesplegable({
  titulo,
  vacio,
  opciones,
  elegidas,
  alCambiar,
}: {
  titulo: string;
  vacio: string;
  opciones: OpcionMulti[];
  elegidas: string[];
  alCambiar: (nuevas: string[]) => void;
}) {
  const nombres = opciones.filter((o) => elegidas.includes(o.valor)).map((o) => o.etiqueta);

  return (
    <details className={styles.multi}>
      <summary>
        <span className={styles.multiTitulo}>{titulo}</span>
        <span className={styles.multiResumen}>{nombres.length > 0 ? nombres.join(", ") : vacio}</span>
      </summary>
      <div className={styles.multiOpciones}>
        {opciones.map((o) => (
          <label key={o.valor} className={styles.casilla}>
            <input
              type="checkbox"
              checked={elegidas.includes(o.valor)}
              onChange={(e) =>
                alCambiar(e.target.checked ? [...elegidas, o.valor] : elegidas.filter((v) => v !== o.valor))
              }
            />
            {o.etiqueta}
          </label>
        ))}
      </div>
    </details>
  );
}
