"use client";

import { useState, type ReactNode } from "react";
import estilos from "../usuarios.module.css";

// Pestañas de la ficha de una persona. Todo el contenido llega ya preparado desde el servidor, así que cambiar de
// pestaña es instantáneo (no se vuelve a pedir nada). Una pestaña solo se pinta cuando se visita por primera vez.
export default function PestanasFicha({
  id,
  inicial,
  pestanas,
  paneles,
}: {
  id: string;
  inicial: string;
  pestanas: readonly { id: string; texto: string }[];
  paneles: Record<string, ReactNode>;
}) {
  const [activa, setActiva] = useState(inicial);
  const [visitadas, setVisitadas] = useState<string[]>([inicial]);

  function ir(pestana: string) {
    setActiva(pestana);
    setVisitadas((v) => (v.includes(pestana) ? v : [...v, pestana]));
    // La dirección se actualiza para poder recargar o compartir esa pestaña.
    try {
      window.history.replaceState(null, "", `/admin/usuarios/${id}?pestana=${pestana}`);
    } catch {
      // Sin historial, la pestaña cambia igualmente.
    }
  }

  return (
    <>
      <nav className={estilos.pestanas} aria-label="Secciones de la ficha">
        {pestanas.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => ir(x.id)}
            className={`${estilos.pestana} ${activa === x.id ? estilos.pestanaActiva : ""}`}
            aria-current={activa === x.id ? "page" : undefined}
          >
            {x.texto}
          </button>
        ))}
      </nav>
      {pestanas.map((x) =>
        visitadas.includes(x.id) ? (
          <div key={x.id} hidden={activa !== x.id}>
            {paneles[x.id]}
          </div>
        ) : null,
      )}
    </>
  );
}
