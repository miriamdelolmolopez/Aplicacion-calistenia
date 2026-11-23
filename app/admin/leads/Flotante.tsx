"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import estilos from "./leads.module.css";

// Un panel que flota pegado a un botón (se dibuja encima de todo, nunca se corta). Se cierra al pulsar fuera o con Escape.
// Un panel dentro de otro (el menú «···» dentro de la lista de opciones) no cierra al padre: los clics suben por los paneles que lo contienen.
export default function Flotante({
  ancla,
  ancho = 280,
  etiqueta,
  alCerrar,
  lado = "abajo",
  children,
}: {
  ancla: HTMLElement | null;
  ancho?: number;
  etiqueta: string;
  alCerrar: () => void;
  lado?: "abajo" | "derecha";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const dentro = useRef(false);
  const calcular = () => {
    const r = ancla?.getBoundingClientRect();
    if (!r) return { arriba: 80, izquierda: 80 };
    const izquierdaBase = lado === "derecha" ? r.right + 6 : r.left;
    const izquierda = Math.max(8, Math.min(izquierdaBase, window.innerWidth - ancho - 8));
    const arriba = lado === "derecha" ? Math.max(8, Math.min(r.top, window.innerHeight - 320)) : Math.min(r.bottom + 6, window.innerHeight - 200);
    return { arriba, izquierda };
  };
  const [posicion, setPosicion] = useState(calcular);

  // Si la página se desplaza o cambia de tamaño, el panel se queda pegado a su botón.
  useEffect(() => {
    const seguir = () => setPosicion(calcular());
    window.addEventListener("scroll", seguir, true);
    window.addEventListener("resize", seguir);
    return () => {
      window.removeEventListener("scroll", seguir, true);
      window.removeEventListener("resize", seguir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancla, ancho, lado]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (dentro.current) {
        dentro.current = false;
        return;
      }
      if (ancla?.contains(e.target as Node)) return;
      alCerrar();
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [ancla, alCerrar]);

  return createPortal(
    <div
      ref={panel}
      className={estilos.flotante}
      style={{ top: posicion.arriba, left: posicion.izquierda, width: ancho }}
      role="dialog"
      aria-label={etiqueta}
      onMouseDown={() => {
        dentro.current = true;
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
