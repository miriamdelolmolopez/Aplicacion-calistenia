"use client";

import { useEffect, type ReactNode } from "react";
import estilos from "./comunes.module.css";

// Pantalla completa con botón Volver: se usa para crear y para editar, así la página "cambia" sin salir de la lista.
export default function PanelCompleto({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alPulsar);
    };
  }, [cerrar]);

  return (
    <div className={estilos.capa} role="dialog" aria-modal="true" aria-label={titulo}>
      <div>
        <div className={estilos.cabeza}>
          <button type="button" className={estilos.volver} onClick={cerrar}>
            ← Volver
          </button>
          <h2>{titulo}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
