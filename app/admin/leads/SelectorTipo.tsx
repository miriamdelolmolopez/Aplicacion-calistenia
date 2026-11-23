"use client";

import styles from "../admin.module.css";
import SelectorOpciones from "./SelectorOpciones";
import type { ItemColor } from "./tipos";

// «Tipo de lead»: se elige uno de los que hay o se crea uno nuevo escribiéndolo. Viaja en el formulario como campo «tipo».
export default function SelectorTipo({ tipos, inicial }: { id?: string; tipos: ItemColor[]; inicial: string | null }) {
  return (
    <div className={styles.campo}>
      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Tipo de lead</span>
      <SelectorOpciones tabla="tipos" opciones={tipos} multiple={false} valores={inicial ? [inicial] : []} nombreCampo="tipo" />
    </div>
  );
}
