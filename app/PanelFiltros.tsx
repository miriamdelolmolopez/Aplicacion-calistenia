"use client";

import { useId, useState } from "react";
import Icono from "./Icono";
import estilos from "./panelFiltros.module.css";

// Botón con el icono del embudo (junto al buscador, si lo hay). Los filtros solo se ven al pulsarlo;
// si hay alguno puesto, el botón muestra cuántos.
export default function PanelFiltros({
  activos = 0,
  etiqueta = "Filtros",
  buscador,
  children,
}: {
  activos?: number;
  etiqueta?: string;
  buscador?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();

  return (
    <div className={estilos.caja}>
      <div className={estilos.fila}>
        {buscador && <div className={estilos.buscador}>{buscador}</div>}
        <button
          type="button"
          className={`${estilos.embudo} ${abierto || activos > 0 ? estilos.embudoActivo : ""}`}
          aria-expanded={abierto}
          aria-controls={id}
          onClick={() => setAbierto((v) => !v)}
        >
          <Icono nombre="embudo" tamano={20} />
          <span>{etiqueta}</span>
          {activos > 0 && <span className={estilos.insignia}>{activos}</span>}
        </button>
      </div>
      {abierto && (
        <div id={id} className={estilos.panel}>
          {children}
        </div>
      )}
    </div>
  );
}
