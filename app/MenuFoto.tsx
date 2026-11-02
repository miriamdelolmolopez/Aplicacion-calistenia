"use client";

import { createPortal } from "react-dom";
import Encuadrador from "./Encuadrador";
import { sinEncuadre } from "@/lib/fotos";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Menú de una foto: Ver foto, Tomar foto, Subir foto y Quitar foto. Se usa en todas las fotos de la app.
// «children» es lo que se pulsa para abrirlo (la foto, o el icono de cámara). Con modo «ventana» el menú sale
// en el centro de la pantalla, para tarjetas donde un desplegable quedaría cortado.
export default function MenuFoto({
  url,
  alElegir,
  alQuitar,
  ocupado = false,
  modo = "desplegable",
  encuadre,
  etiqueta = "Foto",
  idioma = "es",
  children,
}: {
  url: string | null;
  alElegir: (archivo: File) => void | Promise<void>;
  alQuitar: () => void | Promise<void>;
  ocupado?: boolean;
  modo?: "desplegable" | "ventana";
  // Si se da, el menú tiene «Encuadrar foto»: medir devuelve la forma de la tarjeta y guardar guarda la posición elegida.
  encuadre?: { medir: () => number; guardar: (x: number, y: number) => Promise<void> };
  etiqueta?: string;
  idioma?: "es" | "en";
  children: ReactNode;
}) {
  const en = idioma === "en";
  const [abierto, setAbierto] = useState(false);
  const [viendo, setViendo] = useState(false);
  const [encuadrando, setEncuadrando] = useState<number | null>(null);
  const tomar = useRef<HTMLInputElement>(null);
  const subir = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto || modo === "ventana") return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, modo]);

  function archivo(e: React.ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0];
    e.target.value = "";
    if (!a) return;
    setAbierto(false);
    void alElegir(a);
  }

  const opcion: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    minHeight: 48,
    padding: "0 18px",
    font: "inherit",
    textAlign: "left",
    color: "var(--carbon)",
    background: "none",
    border: 0,
    cursor: "pointer",
  };

  // Si la foto está dentro de una tarjeta que es un enlace, pulsar una opción no debe llevar a otra pantalla.
  const quieto = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const lista = (
    <div role="menu" aria-label={etiqueta} style={{ width: 230, padding: "6px 0", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.18)" }}>
      {url && (
        <button type="button" role="menuitem" style={opcion} onClick={(e) => { quieto(e); setAbierto(false); setViendo(true); }}>
          <span aria-hidden="true">👁</span> {en ? "View photo" : "Ver foto"}
        </button>
      )}
      {url && encuadre && (
        <button type="button" role="menuitem" style={opcion} onClick={(e) => { quieto(e); setAbierto(false); setEncuadrando(encuadre.medir()); }}>
          <span aria-hidden="true">✥</span> {en ? "Frame photo" : "Encuadrar foto"}
        </button>
      )}
      <button type="button" role="menuitem" style={opcion} onClick={(e) => { quieto(e); tomar.current?.click(); }}>
        <span aria-hidden="true">📷</span> {en ? "Take photo" : "Tomar foto"}
      </button>
      <button type="button" role="menuitem" style={opcion} onClick={(e) => { quieto(e); subir.current?.click(); }}>
        <span aria-hidden="true">📁</span> {en ? "Upload photo" : "Subir foto"}
      </button>
      {url && (
        <>
          <div style={{ height: 1, margin: "4px 14px", background: "var(--linea)" }} />
          <button
            type="button"
            role="menuitem"
            style={opcion}
            onClick={(e) => {
              quieto(e);
              setAbierto(false);
              void alQuitar();
            }}
          >
            <span aria-hidden="true">🗑</span> {en ? "Remove photo" : "Quitar foto"}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div ref={caja} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!ocupado) setAbierto((a) => !a);
        }}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta}
        disabled={ocupado}
        style={{ padding: 0, font: "inherit", color: "inherit", background: "none", border: 0, cursor: ocupado ? "default" : "pointer", opacity: ocupado ? 0.6 : 1 }}
      >
        {children}
      </button>

      {abierto && modo === "desplegable" && <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 60 }}>{lista}</div>}
      {abierto && modo === "ventana" && createPortal(
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAbierto(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(23, 24, 26, 0.45)" }}
        >
          <div onClick={(e) => e.stopPropagation()}>{lista}</div>
        </div>,
        document.body,
      )}

      <input ref={tomar} type="file" accept="image/*" capture="environment" hidden onClick={(e) => e.stopPropagation()} onChange={archivo} />
      <input ref={subir} type="file" accept="image/*" hidden onClick={(e) => e.stopPropagation()} onChange={archivo} />

      {encuadrando !== null && url && encuadre && <Encuadrador url={url} proporcion={encuadrando} guardar={encuadre.guardar} cerrar={() => setEncuadrando(null)} />}

      {viendo && url && createPortal(
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setViendo(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0, 0, 0, 0.8)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sinEncuadre(url)} alt="" style={{ maxWidth: "100%", maxHeight: "90dvh", borderRadius: 16 }} />
        </div>,
        document.body,
      )}
    </div>
  );
}
