"use client";

import { empezarVerComo } from "../../VerComoAlumno";

// Abre la app entera como la vería esta persona (solo lectura). Tiene el aspecto de los demás botones de «Acciones».
export default function VerComoEsta({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => empezarVerComo(id)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: 52, padding: "0 16px", font: "inherit", fontWeight: 600, color: "var(--carbon)", background: "var(--relleno)", border: "none", borderRadius: 14, cursor: "pointer", textAlign: "left" }}
    >
      <span>Ver la app como esta persona</span>
      <span aria-hidden="true" style={{ fontSize: "1.3rem", color: "var(--secundario)" }}>›</span>
    </button>
  );
}
