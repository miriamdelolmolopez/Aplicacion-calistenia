"use client";

import { useEffect, useState } from "react";
import { buscarAlumnosParaVer, type AlumnoVer } from "./acciones";

// Ventana para elegir como qué alumno/a se quiere ver la app. Se pueden ver sus reservas, pagos, rutina y progreso (solo lectura).
export default function ElegirAlumno({
  abierto,
  alCerrar,
  alElegir,
  alVistaGeneral,
}: {
  abierto: boolean;
  alCerrar: () => void;
  alElegir: (id: string) => void;
  alVistaGeneral?: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<AlumnoVer[] | null>(null);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const espera = setTimeout(() => {
      buscarAlumnosParaVer(texto).then((l) => vigente && setLista(l));
    }, 200);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [abierto, texto]);

  if (!abierto) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elegir alumno/a"
      onClick={alCerrar}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--blanco)", color: "var(--carbon)", borderRadius: 16, padding: 18, width: "100%", maxWidth: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Ver la app como…</h2>
        <input
          type="search"
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar alumno/a"
          style={{ font: "inherit", fontSize: "0.875rem", minHeight: 34, padding: "0 12px 0 34px", borderRadius: 8, border: "1px solid var(--linea-fuerte)", background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E\") no-repeat 11px center" }}
        />
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {lista === null && <p style={{ margin: 0, opacity: 0.7 }}>Buscando…</p>}
          {lista?.length === 0 && <p style={{ margin: 0, opacity: 0.7 }}>No hay nadie con ese nombre.</p>}
          {lista?.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => alElegir(a.id)}
              style={{ font: "inherit", textAlign: "left", flex: "none", minHeight: 56, lineHeight: 1.35, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--linea)", background: "var(--blanco)", cursor: "pointer", color: "inherit" }}
            >
              <strong>{a.nombre}</strong>
              <br />
              <small style={{ opacity: 0.7 }}>{a.detalle}</small>
            </button>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7 }}>Solo se ve lo suyo, sin poder cambiar nada.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {alVistaGeneral && (
            <button type="button" onClick={alVistaGeneral} style={{ font: "inherit", minHeight: 40, padding: "0 14px", borderRadius: 8, border: "1px solid var(--linea)", background: "var(--blanco)", cursor: "pointer", color: "inherit" }}>
              Vista general (sin elegir a nadie)
            </button>
          )}
          <button type="button" onClick={alCerrar} style={{ font: "inherit", minHeight: 40, padding: "0 14px", borderRadius: 8, border: "1px solid var(--linea)", background: "var(--blanco)", cursor: "pointer", color: "inherit" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
