"use client";

import { useState } from "react";
import { analizarVideo } from "@/lib/video";

// Muestra el vídeo de un ejercicio dentro de la app (YouTube, Google Drive o un archivo subido).
// Los de Drive se reproducen con el reproductor normal del móvil, con la forma real del vídeo (vertical u horizontal) y sin los
// controles gigantes de Drive; si Drive no deja (límite de descargas, por ejemplo), se vuelve a su reproductor de siempre.
export default function VideoEjercicio({
  url,
  titulo,
  proporcion = "16 / 9",
  redondeo = 12,
  alConocerForma,
}: {
  url: string | null;
  titulo: string;
  proporcion?: string;
  redondeo?: number;
  // Avisa de si el vídeo es vertical u horizontal en cuanto se sabe (para ajustar el tamaño de la caja que lo rodea).
  alConocerForma?: (ancho: number, alto: number) => void;
}) {
  const video = url ? analizarVideo(url) : null;
  const [forma, setForma] = useState<string | null>(null);
  const [falloDirecto, setFalloDirecto] = useState(false);
  if (!video) return null;

  const nativo = video.origen === "archivo" || (video.origen === "drive" && !!video.directo && !falloDirecto);
  const origenNativo = video.origen === "archivo" ? video.embed : `${video.directo}#t=0.1`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: nativo && forma ? forma : proporcion,
        borderRadius: redondeo,
        overflow: "hidden",
        background: nativo ? "#000" : "var(--relleno)",
      }}
    >
      {nativo ? (
        <video
          src={origenNativo}
          controls
          playsInline
          preload="metadata"
          aria-label={titulo}
          onLoadedMetadata={(e) => {
            const { videoWidth: w, videoHeight: h } = e.currentTarget;
            if (w > 0 && h > 0) {
              setForma(`${w} / ${h}`);
              alConocerForma?.(w, h);
            }
          }}
          onError={() => video.origen === "drive" && setFalloDirecto(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
        />
      ) : (
        <iframe
          src={video.embed}
          title={titulo}
          loading="lazy"
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          // Si se usa el reproductor de Drive, se pinta al doble de tamaño y se reduce a la mitad: así sus controles táctiles quedan pequeños.
          style={
            video.origen === "drive"
              ? { position: "absolute", top: 0, left: 0, width: "200%", height: "200%", transform: "scale(0.5)", transformOrigin: "0 0", border: 0 }
              : { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }
          }
        />
      )}
    </div>
  );
}
