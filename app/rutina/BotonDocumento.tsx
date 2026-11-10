"use client";

import { useEffect, useRef, useState } from "react";
import { useIdioma } from "../useIdioma";

// Icono de documento: al pulsarlo se elige entre ver la rutina o descargarla (en PDF, documento de texto o imagen).
export default function BotonDocumento({ id, texto, className }: { id: string; texto?: string; className?: string }) {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [abierto, setAbierto] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const etiqueta = texto ?? (en ? "View or download" : "Ver o descargar");

  function cerrar() {
    setAbierto(false);
    setDescargando(false);
  }

  // Se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const cierra = () => {
      setAbierto(false);
      setDescargando(false);
    };
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && cierra();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cierra();
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const base = `/api/rutina/${id}/documento`;
  const opcion: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "10px 14px", font: "inherit", fontSize: "0.9rem", color: "#2B2B2A", background: "none", border: 0, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <div ref={caja} style={{ position: "relative", display: "inline-flex", flex: "none" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={etiqueta}
        title={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className={className}
        style={className ? undefined : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", color: "inherit", opacity: 0.75, flex: "none", background: "none", border: 0, cursor: "pointer", padding: 0 }}
      >
        <svg viewBox="0 0 24 24" width={className ? 18 : 22} height={className ? 18 : 22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      </button>
      {abierto && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80, minWidth: 190, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", padding: "6px 0" }}>
          {!descargando ? (
            <>
              <a role="menuitem" href={`${base}?formato=pdf&ver=1`} target="_blank" rel="noreferrer" style={opcion} onClick={cerrar}>
                {en ? "View" : "Ver"}
              </a>
              <button type="button" role="menuitem" style={opcion} onClick={() => setDescargando(true)}>
                {en ? "Download…" : "Descargar…"}
              </button>
            </>
          ) : (
            <>
              <button type="button" style={{ ...opcion, fontSize: "0.8rem", opacity: 0.7 }} onClick={() => setDescargando(false)}>
                ← {en ? "Back" : "Volver"}
              </button>
              <a role="menuitem" href={`${base}?formato=pdf`} download style={opcion} onClick={cerrar}>
                PDF
              </a>
              <a role="menuitem" href={`${base}?formato=docx`} download style={opcion} onClick={cerrar}>
                {en ? "Text document (Word)" : "Documento de texto (Word)"}
              </a>
              <a role="menuitem" href={`${base}?formato=png`} download style={opcion} onClick={cerrar}>
                {en ? "Image (PNG)" : "Imagen (PNG)"}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
