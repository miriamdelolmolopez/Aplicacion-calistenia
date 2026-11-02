"use client";

import { cambiarVistaAlumna } from "../useMiPerfil";

// Botón con un ojo: abre la app tal y como la ve un/a alumno/a, directamente en la pantalla que se está editando.
// Arriba sale un aviso para volver aquí.
export default function VerComoAlumno({ destino }: { destino: string }) {
  return (
    <button
      type="button"
      onClick={() => cambiarVistaAlumna(true, destino)}
      title="Ver cómo lo ve un/a alumno/a"
      aria-label="Ver como alumno/a"
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        padding: "0 14px",
        font: "inherit",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--carbon)",
        background: "var(--blanco)",
        border: "1px solid var(--linea)",
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">👁</span>
      <span className="verComoTexto">Ver como alumno/a</span>
      <style>{`@media (max-width: 640px) { .verComoTexto { display: none; } }`}</style>
    </button>
  );
}
