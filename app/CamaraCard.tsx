"use client";

import { useRef, useState } from "react";
import { cambiarFotoApp, guardarEncuadreFoto, quitarFotoApp } from "./admin/fotos/acciones";
import { prepararFoto } from "./admin/fotos/prepararFoto";
import estilos from "./CamaraCard.module.css";
import MenuFoto from "./MenuFoto";
import { recargarFotosCards, useFotoCard } from "./useFotosCards";
import { useMiPerfil } from "./useMiPerfil";

// Icono de cámara en la esquina de una tarjeta con foto: solo lo ve la administradora.
// La tarjeta que lo contiene tiene que ser position: relative.
export default function CamaraCard({ clave, abajo = false, izquierda = false }: { clave: string; abajo?: boolean; izquierda?: boolean }) {
  const perfil = useMiPerfil();
  const propia = useFotoCard(clave);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  if (typeof perfil !== "object" || perfil === null || perfil.rolReal !== "admin") return null;

  // La tarjeta suele ser un enlace: lo que se pulse aquí no debe llevar a otra pantalla.
  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function elegir(archivo: File) {
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

  // La forma de la tarjeta (ancho / alto), para encuadrar la foto con la misma forma.
  function medir(): number {
    const t = caja.current?.parentElement?.getBoundingClientRect();
    return t && t.height > 0 ? t.width / t.height : 1.5;
  }

  async function encuadrar(x: number, y: number) {
    setError(null);
    const r = await guardarEncuadreFoto(clave, x, y);
    if (!r.ok) setError(r.error ?? "No se ha podido guardar el encuadre.");
    else await recargarFotosCards();
  }

  return (
    <>
      <div ref={caja} className={`${estilos.camara} ${abajo ? estilos.abajo : ""} ${izquierda ? estilos.izquierda : ""}`} onClick={quieto}>
        <MenuFoto url={propia} alElegir={elegir} alQuitar={quitar} ocupado={trabajando} modo="ventana" encuadre={{ medir, guardar: encuadrar }} etiqueta="Foto de esta tarjeta">
          <span className={estilos.boton} title="Cambiar foto">
            {trabajando ? "…" : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            )}
          </span>
        </MenuFoto>
      </div>
      {error && <p className={estilos.error}>{error}</p>}
    </>
  );
}
