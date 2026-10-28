"use client";

import { useRef, useState } from "react";
import { cambiarFotoApp, quitarFotoApp } from "./admin/fotos/acciones";
import { prepararFoto } from "./admin/fotos/prepararFoto";
import estilos from "./CamaraCard.module.css";
import { recargarFotosCards, useFotoCard } from "./useFotosCards";
import { useMiPerfil } from "./useMiPerfil";

// Icono de cámara en la esquina de una tarjeta con foto: solo lo ve la administradora.
// La tarjeta que lo contiene tiene que ser position: relative.
export default function CamaraCard({ clave }: { clave: string }) {
  const perfil = useMiPerfil();
  const propia = useFotoCard(clave);
  const entrada = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (typeof perfil !== "object" || perfil === null || perfil.rolReal !== "admin") return null;

  // La tarjeta suele ser un enlace: lo que se pulse aquí no debe llevar a otra pantalla.
  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setTrabajando(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      f.append("destino", "card");
      f.append("id", clave);
      const r = await cambiarFotoApp(f);
      if (!r.ok) setError(r.error ?? "No se ha podido subir la foto.");
      else await recargarFotosCards();
    } catch {
      setError("No se ha podido leer esa imagen.");
    }
    setTrabajando(false);
  }

  async function quitar() {
    setError(null);
    setTrabajando(true);
    const r = await quitarFotoApp("card", clave);
    if (!r.ok) setError(r.error ?? "No se ha podido quitar.");
    else await recargarFotosCards();
    setTrabajando(false);
  }

  return (
    <>
      <div className={estilos.camara} onClick={quieto}>
        <button type="button" className={estilos.boton} disabled={trabajando} aria-label="Cambiar la foto de esta tarjeta" title="Cambiar foto" onClick={(e) => { quieto(e); entrada.current?.click(); }}>
          {trabajando ? "…" : "📷"}
        </button>
        {propia && !trabajando && (
          <button type="button" className={estilos.boton} aria-label="Volver a la foto de ejemplo" title="Quitar mi foto" onClick={(e) => { quieto(e); void quitar(); }}>
            ↺
          </button>
        )}
        <input ref={entrada} type="file" accept="image/*" hidden onClick={(e) => e.stopPropagation()} onChange={elegir} />
      </div>
      {error && <p className={estilos.error}>{error}</p>}
    </>
  );
}
