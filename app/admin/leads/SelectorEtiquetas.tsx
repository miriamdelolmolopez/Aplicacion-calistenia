"use client";

import SelectorOpciones from "./SelectorOpciones";
import type { ItemColor } from "./tipos";

// Etiquetas: se eligen las que ya hay (puede ser más de una) o se crea una nueva escribiéndola. Las elegidas viajan en el formulario como campos «etiqueta».
export default function SelectorEtiquetas({ etiquetas, iniciales }: { etiquetas: ItemColor[]; iniciales: string[] }) {
  return <SelectorOpciones tabla="etiquetas" opciones={etiquetas} multiple valores={iniciales} nombreCampo="etiqueta" vacio="Sin etiquetas" />;
}
