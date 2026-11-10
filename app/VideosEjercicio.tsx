"use client";

import { useState } from "react";
import type { VideoEjercicio as Video } from "@/lib/videosEjercicio";
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
  if (videos.length === 0) return null;
  const actual = Math.min(pos, videos.length - 1);
  const v = videos[actual];
  const en = idioma === "en";

  return (
    <div style={{ position: "relative" }}>
      <VideoEjercicio key={v.url} url={v.url} titulo={`${titulo} · ${v.nombre}`} proporcion={proporcion} redondeo={redondeo} />
      {videos.length > 1 && (
        <>
          <button type="button" style={flecha("izquierda")} onClick={() => setPos((actual - 1 + videos.length) % videos.length)} aria-label={en ? "Previous video" : "Vídeo anterior"}>
            ‹
          </button>
          <button type="button" style={flecha("derecha")} onClick={() => setPos((actual + 1) % videos.length)} aria-label={en ? "Next video" : "Vídeo siguiente"}>
            ›
          </button>
          <span
            style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", zIndex: 3, maxWidth: "70%", padding: "4px 12px", borderRadius: 999, background: "rgba(23, 24, 26, 0.65)", color: "#fff", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", pointerEvents: "none" }}
          >
            {v.nombre} · {actual + 1}/{videos.length}
          </span>
        </>
      )}
    </div>
  );
}
