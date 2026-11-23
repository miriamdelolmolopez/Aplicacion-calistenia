"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import estilos from "./leads.module.css";

// La flechita de los filtros: solo dos palitos formando una flecha hacia abajo.
export function Flecha({ tamano = 14 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const ANCHO = 260;

// Cabecera de una columna con su filtro, como en Excel: al pulsar la flecha se abre la lista y se marcan las opciones que se quieran.
// Si no se pasan opciones, se enseña el «contenido» que se le dé (por ejemplo el de las fechas).
// La lista se dibuja encima de todo (no dentro de la tabla) para que nunca se corte, ni en el borde de la pantalla.
export default function FiltroColumna({
  titulo,
  opciones,
  seleccion = [],
  alCambiar,
  activo,
  contenido,
}: {
  titulo: string;
  opciones?: string[];
  seleccion?: string[];
  alCambiar?: (nuevas: string[]) => void;
  activo?: boolean;
  contenido?: ReactNode;
}) {
  const [posicion, setPosicion] = useState<{ arriba: number; izquierda: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const abierto = posicion !== null;

  function abrir() {
    if (abierto) return setPosicion(null);
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    // Pegada al botón, pero sin salirse por la derecha ni por la izquierda de la pantalla.
    const izquierda = Math.max(8, Math.min(r.left, window.innerWidth - ANCHO - 8));
    setPosicion({ arriba: r.bottom + 6, izquierda });
  }

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setPosicion(null);
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (lista.current?.contains(t) || boton.current?.contains(t)) return;
      cerrar();
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("resize", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [abierto]);

  const marcar = (valor: string) => {
    if (!alCambiar) return;
    alCambiar(seleccion.includes(valor) ? seleccion.filter((s) => s !== valor) : [...seleccion, valor]);
  };
  const filtrando = activo ?? seleccion.length > 0;

  return (
    <div className={estilos.cabeceraColumna}>
      <span>{titulo}</span>
      <button ref={boton} type="button" className={`${estilos.flechaFiltro} ${filtrando ? estilos.flechaActiva : ""}`} aria-label={`Filtrar por ${titulo}`} aria-expanded={abierto} onClick={abrir}>
        <Flecha />
      </button>
      {posicion &&
        createPortal(
          <div ref={lista} className={estilos.desplegable} style={{ top: posicion.arriba, left: posicion.izquierda, width: ANCHO }} role="dialog" aria-label={`Filtro de ${titulo}`}>
            {opciones ? (
              <>
                {opciones.length === 0 && <p className={estilos.vacioFiltro}>Todavía no hay opciones.</p>}
                <ul className={estilos.opciones}>
                  {opciones.map((o) => (
                    <li key={o}>
                      <label>
                        <input type="checkbox" checked={seleccion.includes(o)} onChange={() => marcar(o)} />
                        <span>{o}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {seleccion.length > 0 && (
                  <button type="button" className={estilos.limpiar} onClick={() => alCambiar?.([])}>
                    Quitar filtro
                  </button>
                )}
              </>
            ) : (
              contenido
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
