"use client";

import { useState } from "react";
import { olvidarPerfilCargado } from "../useMiPerfil";
import { fijarComo } from "../rutina/useComo";
import ElegirAlumno from "./ver/ElegirAlumno";

// Pasa a ver la app entera como la vería un/a alumno/a concreto/a (solo lectura). Solo está en Inicio y en Perfil.
export function empezarVerComo(id: string) {
  try {
    sessionStorage.setItem("comoVolver", location.pathname);
  } catch {
    // Se volverá a Inicio.
  }
  fijarComo(id);
  olvidarPerfilCargado();
  window.location.href = "/inicio";
}

export default function VerComoAlumno() {
  const [eligiendo, setEligiendo] = useState(false);
  return (
    <>
      <ElegirAlumno abierto={eligiendo} alCerrar={() => setEligiendo(false)} alElegir={empezarVerComo} />
      <button
        type="button"
        onClick={() => setEligiendo(true)}
        title="Ver la app como la ve un/a alumno/a (eliges quién)"
        aria-label="Ver como alumno/a"
        style={{
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
        <span aria-hidden="true">👁</span> Ver como alumno/a
      </button>
    </>
  );
}
