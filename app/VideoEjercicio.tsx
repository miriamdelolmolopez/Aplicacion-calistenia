import { analizarVideo } from "@/lib/video";

// Muestra el vídeo de un ejercicio dentro de la app (YouTube, Google Drive o un archivo subido).
export default function VideoEjercicio({ url, titulo, proporcion = "16 / 9", redondeo = 12 }: { url: string | null; titulo: string; proporcion?: string; redondeo?: number }) {
  const video = url ? analizarVideo(url) : null;
  if (!video) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: proporcion,
        borderRadius: redondeo,
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
        // El reproductor de Drive pinta unos controles enormes en el móvil que tapan el vídeo. Se pinta al doble de tamaño y se reduce a la mitad:
        // así los controles se quedan pequeños y el vídeo se sigue viendo entero.
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
