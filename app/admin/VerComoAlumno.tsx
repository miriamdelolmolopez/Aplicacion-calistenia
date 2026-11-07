"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cambiarVistaAlumna } from "../useMiPerfil";
import ElegirAlumno from "./ver/ElegirAlumno";

// Botón con un ojo: abre la app tal y como la ve un/a alumno/a, directamente en la pantalla que se está editando.
// Arriba sale un aviso para volver aquí.
export default function VerComoAlumno({ destino, porDefecto = false }: { destino: string; porDefecto?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [oculto, setOculto] = useState(false);
  // El ojo de la cabecera aparece solo si la pantalla no ha puesto ya el suyo (con su destino propio).
  useEffect(() => {
    if (!porDefecto) return;
    const cab = ref.current?.closest("header");
    if (cab && cab.querySelectorAll("[data-ojo=propio]").length > 0) setOculto(true);
  }, [porDefecto]);
  const [eligiendo, setEligiendo] = useState(false);
  const router = useRouter();
  return (
    <>
    <ElegirAlumno
      abierto={eligiendo}
      alCerrar={() => setEligiendo(false)}
      alElegir={(id) => router.push(`/clases/mis-reservas?como=${id}`)}
      alVistaGeneral={() => cambiarVistaAlumna(true, destino)}
    />
    <button
      type="button"
      onClick={() => setEligiendo(true)}
      ref={ref}
      data-ojo={porDefecto ? "defecto" : "propio"}
      hidden={oculto}
      title="Ver cómo lo ve un/a alumno/a (eliges quién)"
      aria-label="Ver como alumno/a"
      style={{
        marginLeft: "auto",
        display: oculto ? "none" : "inline-flex",
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
    </>
  );
}
