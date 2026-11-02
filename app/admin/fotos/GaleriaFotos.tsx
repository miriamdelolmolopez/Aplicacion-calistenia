"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Encuadrador from "../../Encuadrador";
import { encuadreDeFoto, sinEncuadre } from "@/lib/fotos";
import { anadirFotoGaleria, guardarEncuadreGaleria, quitarFotoGaleria } from "./acciones";
import estilos from "./botonFoto.module.css";
import { prepararFoto } from "./prepararFoto";

// Varias fotos para un mismo sitio (Portada o Saludo de Inicio): se pueden añadir y quitar, y cada visita enseña una al azar.
export default function GaleriaFotos({ destino, fotos }: { destino: "portada" | "inicio"; fotos: { clave: string; url: string }[] }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encuadrando, setEncuadrando] = useState<{ clave: string; url: string } | null>(null);

  async function anadir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setTrabajando(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      f.append("destino", destino);
      const r = await anadirFotoGaleria(f);
      if (!r.ok) setError(r.error ?? "No se ha podido subir la foto.");
      else router.refresh();
    } catch {
      setError("No se ha podido leer esa imagen.");
    }
    setTrabajando(false);
  }

  async function quitar(clave: string) {
    if (!window.confirm("¿Quitar esta foto?")) return;
    setError(null);
    setTrabajando(true);
    const r = await quitarFotoGaleria(clave);
    if (!r.ok) setError(r.error ?? "No se ha podido quitar.");
    else router.refresh();
    setTrabajando(false);
  }

  return (
    <div className={estilos.caja} style={{ flexDirection: "column", alignItems: "flex-start" }}>
      {fotos.length === 0 && <div className={estilos.mini}>Foto de ejemplo</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {fotos.map((f) => (
          <div key={f.clave} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className={estilos.mini} style={{ backgroundImage: `url("${sinEncuadre(f.url)}")`, backgroundSize: "cover", backgroundPosition: `${encuadreDeFoto(f.url).x}% ${encuadreDeFoto(f.url).y}%` }} />
            <button type="button" className={estilos.boton} disabled={trabajando} onClick={() => setEncuadrando(f)}>
              Encuadrar
            </button>
            <button type="button" className={estilos.boton} disabled={trabajando} onClick={() => quitar(f.clave)}>
              Quitar
            </button>
          </div>
        ))}
      </div>
      <label className={estilos.boton}>
        {trabajando ? "Subiendo…" : fotos.length === 0 ? "Poner foto" : "Añadir otra foto"}
        <input type="file" accept="image/*" hidden disabled={trabajando} onChange={anadir} />
      </label>
      {fotos.length > 1 && <p style={{ margin: 0, fontSize: "0.85rem" }}>Cada vez que alguien entra se enseña una de estas fotos al azar.</p>}
      {error && <p className={estilos.error}>{error}</p>}
      {encuadrando && (
        <Encuadrador
          url={encuadrando.url}
          proporcion={1.6}
          guardar={async (x, y) => {
            const r = await guardarEncuadreGaleria(encuadrando.clave, x, y);
            if (!r.ok) setError(r.error ?? "No se ha podido guardar el encuadre.");
            else router.refresh();
          }}
          cerrar={() => setEncuadrando(null)}
        />
      )}
    </div>
  );
}
