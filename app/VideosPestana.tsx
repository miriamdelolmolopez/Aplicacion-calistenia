"use client";

import { useState } from "react";
import type { VideoEjercicio as Video } from "@/lib/videosEjercicio";
import { analizarVideo } from "@/lib/video";
import VideoEjercicio from "./VideoEjercicio";

// Un vídeo con el tamaño que le toca: vertical (de móvil) u horizontal. Los enlaces de Drive no dicen cómo se grabó,
// así que se empieza en vertical (lo habitual al grabar con el móvil) y hay un botón para cambiarlo.
function Reproductor({ video, titulo, en }: { video: Video; titulo: string; en: boolean }) {
  const origen = analizarVideo(video.url)?.origen;
  const [vertical, setVertical] = useState(origen !== "youtube");
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <figcaption style={{ fontWeight: 600, fontSize: "0.95rem" }}>{video.nombre}</figcaption>
      <div style={{ width: vertical ? "min(100%, calc(72dvh * 9 / 16))" : "100%", margin: "0 auto" }}>
        <VideoEjercicio url={video.url} titulo={`${titulo} · ${video.nombre}`} proporcion={vertical ? "9 / 16" : "16 / 9"} redondeo={16} alConocerForma={(ancho, alto) => setVertical(alto > ancho)} />
      </div>
      <button
        type="button"
        onClick={() => setVertical(!vertical)}
        style={{ alignSelf: "center", cursor: "pointer", font: "inherit", fontSize: "0.8rem", padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", color: "inherit" }}
      >
        {vertical ? (en ? "Switch to horizontal" : "Pasar a horizontal") : en ? "Switch to vertical" : "Pasar a vertical"}
      </button>
    </figure>
  );
}

// Pestaña «Vídeos» de un ejercicio: todos los vídeos uno debajo de otro, cada uno con su nombre.
export default function VideosPestana({ videos, titulo, idioma = "es" }: { videos: Video[]; titulo: string; idioma?: "es" | "en" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {videos.map((v) => (
        <Reproductor key={v.url} video={v} titulo={titulo} en={idioma === "en"} />
      ))}
    </div>
  );
}
