"use client";

import { useState } from "react";
import type { VideoEjercicio as Video } from "@/lib/videosEjercicio";
import { analizarVideo } from "@/lib/video";
import VideoEjercicio from "./VideoEjercicio";

const flecha = (lado: "izquierda" | "derecha"): React.CSSProperties => ({
  position: "absolute",
  top: "50%",
  [lado === "izquierda" ? "left" : "right"]: 8,
  transform: "translateY(-50%)",
  zIndex: 3,
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: 0,
  background: "rgba(23, 24, 26, 0.6)",
  color: "#fff",
  fontSize: "1.6rem",
  lineHeight: 1,
  cursor: "pointer",
});

// Los vídeos de un ejercicio: con más de uno salen dos flechas a los lados para pasar al siguiente o al anterior, y el nombre de cada vídeo.
export default function VideosEjercicio({ videos, titulo, proporcion, redondeo, idioma = "es" }: { videos: Video[]; titulo: string; proporcion?: string; redondeo?: number; idioma?: "es" | "en" }) {
  const [pos, setPos] = useState(0);
  // Sin proporción fija (el entreno en directo), cada vídeo se ve vertical u horizontal: los grabados con el móvil (Drive) empiezan en vertical y se puede cambiar.
  const [formatos, setFormatos] = useState<Record<string, boolean>>({});
  if (videos.length === 0) return null;
  const actual = Math.min(pos, videos.length - 1);
  const v = videos[actual];
  const en = idioma === "en";
  const adaptable = proporcion === undefined;
  const vertical = adaptable ? (formatos[v.url] ?? analizarVideo(v.url)?.origen !== "youtube") : false;

  return (
    <div style={adaptable ? { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } : undefined}>
    <div style={{ position: "relative", ...(adaptable ? { width: vertical ? "min(100%, calc(56dvh * 9 / 16))" : "100%" } : null) }}>
      <VideoEjercicio
        key={v.url}
        url={v.url}
        titulo={`${titulo} · ${v.nombre}`}
        proporcion={adaptable ? (vertical ? "9 / 16" : "16 / 9") : proporcion}
        redondeo={redondeo}
        alConocerForma={adaptable ? (ancho, alto) => setFormatos((previo) => ({ ...previo, [v.url]: alto > ancho })) : undefined}
      />
      {videos.length > 1 && (
        <>
          <button type="button" style={flecha("izquierda")} onClick={() => setPos((actual - 1 + videos.length) % videos.length)} aria-label={en ? "Previous video" : "Vídeo anterior"}>
            ‹
          </button>
          <button type="button" style={flecha("derecha")} onClick={() => setPos((actual + 1) % videos.length)} aria-label={en ? "Next video" : "Vídeo siguiente"}>
            ›
          </button>
        </>
      )}
      {/* El nombre del vídeo, siempre (arriba, para no tapar los controles de abajo). Con varios, también cuál es de cuántos. */}
      {(v.nombre || videos.length > 1) && (
        <span
          style={{ position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)", zIndex: 3, maxWidth: "70%", padding: "4px 12px", borderRadius: 999, background: "rgba(23, 24, 26, 0.65)", color: "#fff", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", pointerEvents: "none" }}
        >
          {[v.nombre, videos.length > 1 ? `${actual + 1}/${videos.length}` : ""].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
    {adaptable && (
      <button
        type="button"
        onClick={() => setFormatos({ ...formatos, [v.url]: !vertical })}
        style={{ cursor: "pointer", font: "inherit", fontSize: "0.78rem", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(128,128,128,0.4)", background: "transparent", color: "inherit", minHeight: 32 }}
      >
        {vertical ? (en ? "Switch to horizontal" : "Pasar a horizontal") : en ? "Switch to vertical" : "Pasar a vertical"}
      </button>
    )}
    </div>
  );
}
