"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Avatar from "./Avatar";

// Foto de una persona que se puede pulsar para verla en grande (sin foto, se queda como un simple círculo con las iniciales).
export default function FotoAmpliable({ nombre, url, tamano = 72 }: { nombre: string; url?: string | null; tamano?: number }) {
  const [grande, setGrande] = useState(false);

  useEffect(() => {
    if (!grande) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setGrande(false);
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [grande]);

  if (!url) return <Avatar nombre={nombre} url={url} tamano={tamano} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setGrande(true)}
        aria-label={`Ver la foto de ${nombre} en grande`}
        title="Ver en grande"
        style={{ all: "unset", cursor: "zoom-in", display: "inline-flex", flexShrink: 0, borderRadius: "50%" }}
      >
        <Avatar nombre={nombre} url={url} tamano={tamano} />
      </button>
      {grande && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${nombre}`}
          onClick={() => setGrande(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 16, cursor: "zoom-out" }}
        >
          <img src={url} alt={`Foto de ${nombre}`} style={{ maxWidth: "min(94vw, 900px)", maxHeight: "82dvh", objectFit: "contain", borderRadius: 16, background: "#111" }} />
          <span style={{ color: "#fff", fontWeight: 600 }}>{nombre}</span>
          <button
            type="button"
            onClick={() => setGrande(false)}
            style={{ cursor: "pointer", font: "inherit", padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)", background: "transparent", color: "#fff" }}
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
