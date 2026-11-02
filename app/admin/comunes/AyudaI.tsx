"use client";

import { useId, useSyncExternalStore } from "react";

// Solo puede haber una ayuda abierta a la vez: al abrir otra, la anterior se cierra.
let abiertaAhora: string | null = null;
const oyentes = new Set<() => void>();
function abrir(id: string | null) {
  abiertaAhora = id;
  oyentes.forEach((o) => o());
}
function suscribir(o: () => void) {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
}

// Circulito con una «i»: al pulsarlo se abre una frase corta que explica qué hace esa opción.
// Se puede poner dentro de una etiqueta (label): pulsarlo no marca ni enfoca el campo.
export default function AyudaI({ texto }: { texto: string }) {
  const id = useId();
  const abierta = useSyncExternalStore(suscribir, () => abiertaAhora === id, () => false);
  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6, verticalAlign: "middle", lineHeight: 1 }}>
      <button
        type="button"
        aria-label="¿Qué hace esta opción?"
        aria-expanded={abierta}
        onClick={(e) => {
          quieto(e);
          abrir(abierta ? null : id);
        }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, margin: "-8px", padding: 0, background: "transparent", border: 0, cursor: "pointer" }}
      >
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, font: "inherit", fontSize: "0.65rem", fontWeight: 700, lineHeight: 1, color: "#8a8d93", border: "1.5px solid #b5b8bd", borderRadius: "50%" }}>
          i
        </span>
      </button>
      {abierta && (
        <span
          role="note"
          onClick={(e) => {
            quieto(e);
            abrir(null);
          }}
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, width: 260, maxWidth: "70vw", padding: "10px 12px", fontSize: "0.85rem", fontWeight: 400, lineHeight: 1.4, color: "var(--carbon)", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}
