"use client";

import { useState } from "react";

// Circulito con una «i»: al pulsarlo se abre una frase corta que explica qué hace esa opción.
// Se puede poner dentro de una etiqueta (label): pulsarlo no marca ni enfoca el campo.
export default function AyudaI({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6, verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label="¿Qué hace esta opción?"
        aria-expanded={abierta}
        onClick={(e) => {
          quieto(e);
          setAbierta((a) => !a);
        }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, padding: 0, font: "inherit", fontSize: "0.8rem", fontWeight: 700, color: "var(--acento-oscuro)", background: "transparent", border: "1.5px solid var(--acento)", borderRadius: "50%", cursor: "pointer" }}
      >
        i
      </button>
      {abierta && (
        <span
          role="note"
          onClick={(e) => {
            quieto(e);
            setAbierta(false);
          }}
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, width: 260, maxWidth: "70vw", padding: "10px 12px", fontSize: "0.85rem", fontWeight: 400, lineHeight: 1.4, color: "var(--carbon)", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}
