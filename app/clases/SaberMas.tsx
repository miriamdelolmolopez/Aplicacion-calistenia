"use client";

import { useEffect } from "react";
import estilos from "./saberMas.module.css";

const TEXTO = {
  es: { cerrar: "Cerrar", vacio: "Pronto tendrás aquí la descripción de esta clase." },
  en: { cerrar: "Close", vacio: "The description of this class will be here soon." },
};

// Panel que se desliza desde abajo con la descripción de una clase. No cambia de pantalla.
export default function SaberMas({
  titulo,
  descripcion,
  idioma,
  alCerrar,
}: {
  titulo: string;
  descripcion: string | null;
  idioma: "es" | "en";
  alCerrar: () => void;
}) {
  const tx = TEXTO[idioma];

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [alCerrar]);

  return (
    <div className={estilos.capa} onClick={alCerrar}>
      <div className={estilos.panel} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={estilos.cerrar} aria-label={tx.cerrar} onClick={alCerrar}>
          ✕
        </button>
        <h2>{titulo}</h2>
        {(descripcion ?? "")
          .split(/\n+/)
          .filter(Boolean)
          .map((p, i) => <p key={i}>{p}</p>)}
        {!descripcion && <p>{tx.vacio}</p>}
      </div>
    </div>
  );
}
