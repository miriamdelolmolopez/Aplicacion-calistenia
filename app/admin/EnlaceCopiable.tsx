"use client";

import { useState } from "react";
import styles from "./admin.module.css";

// Muestra el enlace personal con un botón para copiarlo.
export default function EnlaceCopiable({ enlace }: { enlace: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className={styles.enlaceCaja}>
      <input readOnly value={enlace} aria-label="Enlace personal" />
      <button type="button" className={styles.boton} onClick={copiar}>
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
