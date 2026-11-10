import { ImageResponse } from "next/og";
import type { Bloque } from "./rutinaDocumento";

const ANCHO = 1080;
const PAD = 64;

const ESTILO: Record<Bloque["tipo"], { tam: number; peso: number; color: string; sangria: number; antes: number }> = {
  titulo: { tam: 54, peso: 700, color: "#2B2B2A", sangria: 0, antes: 0 },
  meta: { tam: 26, peso: 400, color: "#555555", sangria: 0, antes: 8 },
  h1: { tam: 38, peso: 700, color: "#5A5E3B", sangria: 0, antes: 46 },
  h2: { tam: 30, peso: 700, color: "#5A5E3B", sangria: 0, antes: 30 },
  texto: { tam: 26, peso: 400, color: "#2B2B2A", sangria: 0, antes: 8 },
  ejercicio: { tam: 30, peso: 700, color: "#2B2B2A", sangria: 0, antes: 26 },
  detalle: { tam: 26, peso: 400, color: "#2B2B2A", sangria: 28, antes: 4 },
  nota: { tam: 24, peso: 400, color: "#555555", sangria: 28, antes: 4 },
  enlace: { tam: 21, peso: 400, color: "#0563C1", sangria: 28, antes: 4 },
};

// La rutina como una imagen larga (PNG), con los colores de la marca. El alto se calcula según lo que ocupe el texto.
export function rutinaEnImagen(bloques: Bloque[]): ImageResponse {
  const util = ANCHO - 2 * PAD;
  let alto = 2 * PAD;
  for (const b of bloques) {
    const e = ESTILO[b.tipo];
    const caben = Math.max(8, Math.floor((util - e.sangria) / (e.tam * 0.56)));
    const lineas = Math.max(1, Math.ceil(b.texto.length / caben));
    alto += e.antes + lineas * e.tam * 1.4;
  }
  alto = Math.min(Math.ceil(alto + 20), 8000);

  return new ImageResponse(
    (
      <div style={{ width: ANCHO, height: alto, display: "flex", flexDirection: "column", padding: PAD, background: "#F4EFE6", color: "#2B2B2A" }}>
        {bloques.map((b, i) => {
          const e = ESTILO[b.tipo];
          return (
            <div
              key={i}
              style={{ display: "flex", marginTop: e.antes, marginLeft: e.sangria, fontSize: e.tam, fontWeight: e.peso, color: e.color, lineHeight: 1.4, fontStyle: b.tipo === "nota" ? "italic" : "normal", wordBreak: "break-all" }}
            >
              {b.texto}
            </div>
          );
        })}
      </div>
    ),
    { width: ANCHO, height: alto },
  );
}
