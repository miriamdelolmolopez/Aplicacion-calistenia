"use client";

import { useState, type ReactNode } from "react";
import estilos from "./comunes.module.css";
import PanelCompleto from "./PanelCompleto";

// Botón compacto y resaltado. Al pulsarlo se abre la pantalla donde se rellena todo y se crea.
export default function Nuevo({ etiqueta = "Nuevo", titulo, render }: { etiqueta?: string; titulo: string; render: (cerrar: () => void) => ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  return (
    <>
      <button type="button" className={estilos.nuevo} onClick={() => setAbierto(true)}>
        <b aria-hidden="true">+</b> {etiqueta}
      </button>
      {abierto && (
        <PanelCompleto titulo={titulo} cerrar={cerrar}>
          {render(cerrar)}
        </PanelCompleto>
      )}
    </>
  );
}
