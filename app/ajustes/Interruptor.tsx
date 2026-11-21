"use client";

import estilos from "./ajustesTarjetas.module.css";

// Interruptor de encendido y apagado (azul = activado, gris = apagado).
export default function Interruptor({ activo, alCambiar, nombre, fijo }: { activo: boolean; alCambiar?: () => void; nombre: string; fijo?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={nombre} disabled={fijo} className={`${estilos.interruptor} ${activo ? estilos.encendido : ""}`} onClick={alCambiar}>
      <span className={estilos.bola} />
    </button>
  );
}
