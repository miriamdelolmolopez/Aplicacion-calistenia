"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cambiarFotoApp, quitarFotoApp, type Destino } from "./acciones";
import estilos from "./botonFoto.module.css";

// Reduce la foto en el navegador: lado largo de 1200 px, jpg, unos 150 KB.
async function prepararFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, 1200 / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/jpeg", 0.82),
  );
}

// Miniatura de la foto actual y botones para cambiarla o quitarla.
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

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
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
    setTrabajando(true);
    const r = await quitarFotoApp(destino, id);
    if (!r.ok) setError(r.error ?? "No se ha podido quitar.");
    else router.refresh();
    setTrabajando(false);
  }

  return (
    <div className={estilos.caja}>
      <div className={estilos.mini} style={actual ? { backgroundImage: `url(${actual})` } : undefined}>
        {!actual && <span>Foto de ejemplo</span>}
      </div>
      <div className={estilos.botones}>
        <label className={estilos.boton}>
          {trabajando ? "Subiendo…" : actual ? "Cambiar foto" : "Poner foto"}
          <input type="file" accept="image/*" hidden disabled={trabajando} onChange={elegir} />
        </label>
        {actual && (
          <button type="button" className={estilos.boton} disabled={trabajando} onClick={quitar}>
            Quitar foto
          </button>
        )}
      </div>
      {error && <p className={estilos.error}>{error}</p>}
    </div>
  );
}
