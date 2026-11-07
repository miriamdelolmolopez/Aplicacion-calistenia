"use client";

import { empezarVerComo } from "../../VerComoAlumno";

// Abre la app entera como la vería esta persona (solo lectura).
export default function VerComoEsta({ id }: { id: string }) {
  return (
    <button type="button" onClick={() => empezarVerComo(id)} style={{ font: "inherit", textAlign: "left", background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
      Ver la app como esta persona
    </button>
  );
}
