"use client";

import { useId, useState } from "react";
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          <span>{activos > 0 ? `${activos} ${etiqueta === "Filters" ? (activos === 1 ? "filter" : "filters") : activos === 1 ? "filtro" : "filtros"}` : etiqueta}</span>
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
