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
        color: "var(--blanco)",
        background: "rgba(255, 255, 255, 0.18)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">👁</span> Ver como alumno/a
    </button>
  );
}
