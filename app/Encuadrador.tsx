"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { encuadreDeFoto, sinEncuadre } from "@/lib/fotos";

// Ventana para encuadrar la foto de una tarjeta: se arrastra la foto hasta dejar a la vista la parte que se quiere.
// La caja tiene la misma forma que la tarjeta, así que lo que se ve aquí es lo que se verá allí.
export default function Encuadrador({
  url,
  proporcion,
  guardar,
  cerrar,
}: {
  url: string;
  proporcion: number; // ancho / alto de la tarjeta
  guardar: (x: number, y: number) => Promise<void>;
  cerrar: () => void;
}) {
  const [pos, setPos] = useState(() => encuadreDeFoto(url));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const limpia = sinEncuadre(url);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = limpia;
  }, [limpia]);

  function mover(e: React.PointerEvent) {
    const a = arrastre.current;
    const c = caja.current;
    if (!a || !c || !natural) return;
    const r = c.getBoundingClientRect();
    const escala = Math.max(r.width / natural.w, r.height / natural.h);
    const sobraX = natural.w * escala - r.width;
    const sobraY = natural.h * escala - r.height;
    const nx = sobraX > 1 ? a.x - ((e.clientX - a.px) / sobraX) * 100 : 50;
    const ny = sobraY > 1 ? a.y - ((e.clientY - a.py) / sobraY) * 100 : 50;
    setPos({ x: Math.min(100, Math.max(0, nx)), y: Math.min(100, Math.max(0, ny)) });
  }

  async function aceptar() {
    setGuardando(true);
    await guardar(pos.x, pos.y);
    setGuardando(false);
    cerrar();
  }

  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const boton: React.CSSProperties = { minHeight: 48, padding: "0 20px", font: "inherit", fontWeight: 700, borderRadius: 999, cursor: "pointer" };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Encuadrar foto"
      onClick={quieto}
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(23, 24, 26, 0.6)" }}
    >
      <div style={{ width: "100%", maxWidth: 440, maxHeight: "92dvh", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14, background: "var(--blanco)", borderRadius: 24 }}>
        <strong style={{ fontSize: "1.1rem" }}>Encuadrar foto</strong>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--secundario)" }}>Arrastra la foto hasta dejar a la vista la parte que quieres. Así se verá en la tarjeta.</p>
        <div
          ref={caja}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            arrastre.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
          }}
          onPointerMove={mover}
          onPointerUp={() => (arrastre.current = null)}
          onPointerCancel={() => (arrastre.current = null)}
          style={{
            width: "100%",
            aspectRatio: String(Math.min(3, Math.max(0.5, proporcion))),
            backgroundImage: `url("${limpia}")`,
            backgroundSize: "cover",
            backgroundPosition: `${pos.x}% ${pos.y}%`,
            backgroundColor: "#1f2023",
            borderRadius: 20,
            cursor: "grab",
            touchAction: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={aceptar} disabled={guardando} style={{ ...boton, flex: 1, color: "#ffffff", background: "var(--acento)", border: 0 }}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => setPos({ x: 50, y: 50 })} disabled={guardando} style={{ ...boton, color: "var(--carbon)", background: "transparent", border: "1.5px solid var(--linea)" }}>
            Centrar
          </button>
          <button type="button" onClick={cerrar} disabled={guardando} style={{ ...boton, color: "var(--carbon)", background: "transparent", border: "1.5px solid var(--linea)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
