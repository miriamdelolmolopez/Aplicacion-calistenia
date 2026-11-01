"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MenuFoto from "../../MenuFoto";
import { cambiarFotoApp, quitarFotoApp, type Destino } from "./acciones";
import estilos from "./botonFoto.module.css";
import { prepararFoto } from "./prepararFoto";

// Miniatura de la foto actual: al pulsarla sale el menú de ver, tomar, subir o quitar la foto.
export default function BotonFoto({
  destino,
  id = "",
  actual,
}: {
  destino: Destino;
  id?: string;
  actual: string | null;
}) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivo: File) {
    setError(null);
    setTrabajando(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      f.append("destino", destino);
      f.append("id", id);
      const r = await cambiarFotoApp(f);
      if (!r.ok) setError(r.error ?? "No se ha podido subir la foto.");
      else router.refresh();
    } catch {
      setError("No se ha podido leer esa imagen.");
    }
    setTrabajando(false);
  }

  async function quitar() {
    if (!window.confirm("¿Quitar esta foto?")) return;
    setTrabajando(true);
    const r = await quitarFotoApp(destino, id);
    if (!r.ok) setError(r.error ?? "No se ha podido quitar.");
    else router.refresh();
    setTrabajando(false);
  }

  return (
    <div className={estilos.caja}>
      <MenuFoto url={actual} alElegir={elegir} alQuitar={quitar} ocupado={trabajando} etiqueta="Foto">
        <span className={estilos.mini} style={actual ? { backgroundImage: `url(${actual})` } : undefined}>
          {!actual && <span>{trabajando ? "Subiendo…" : "Foto de ejemplo"}</span>}
          {actual && trabajando && <span style={{ background: "rgba(0,0,0,0.5)", color: "#fff", padding: "2px 8px", borderRadius: 8 }}>Subiendo…</span>}
        </span>
      </MenuFoto>
      {error && <p className={estilos.error}>{error}</p>}
    </div>
  );
}
