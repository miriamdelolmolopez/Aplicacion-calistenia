import { analizarVideo } from "@/lib/video";

// Muestra el vídeo de un ejercicio dentro de la app (YouTube, Google Drive o un archivo subido).
export default function VideoEjercicio({ url, titulo }: { url: string | null; titulo: string }) {
  const video = url ? analizarVideo(url) : null;
  if (!video) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--relleno)",
      }}
    >
      {video.origen === "archivo" ? (
        <video src={video.embed} controls playsInline preload="metadata" aria-label={titulo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000" }} />
      ) : (
      <iframe
        src={video.embed}
        title={titulo}
        loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
      )}
    </div>
  );
}
