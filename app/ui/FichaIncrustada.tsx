"use client";

import { useEffect } from "react";

// Ficha de un ejercicio (vídeo, pasos, músculos, trabajo y material) a pantalla completa, encima de lo que se estaba viendo.
// Se abre solo desde dentro de una rutina; no hay una biblioteca que se pueda recorrer.
export default function FichaIncrustada({ id, nombre, textoVolver = "← Volver a la rutina", cerrar }: { id: string; nombre: string; textoVolver?: string; cerrar: () => void }) {
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
    <div role="dialog" aria-modal="true" aria-label={nombre} style={{ position: "fixed", inset: 0, zIndex: 90, background: "var(--crema, #F4EFE6)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", maxWidth: 760, width: "100%", margin: "0 auto" }}>
        <button type="button" onClick={cerrar} style={{ cursor: "pointer", font: "inherit", padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", minHeight: 40 }}>
          {textoVolver}
        </button>
      </div>
      <iframe src={`/biblioteca/${id}?incrustado=1`} title={nombre} style={{ flex: 1, width: "100%", maxWidth: 760, margin: "0 auto", border: 0 }} />
    </div>
  );
}
