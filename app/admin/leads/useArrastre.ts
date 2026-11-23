"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";

// Mueve un elemento de una lista de sitio: lo quita de «desde» y lo pone en «hasta».
export function moverElemento<T>(lista: T[], desde: number, hasta: number): T[] {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
}

// Ordenar filas arrastrándolas. Se agarra por el «asa» (los seis puntitos); con el teclado, enfocando el asa y pulsando flecha arriba o abajo.
export function useArrastre(mover: (desde: number, hasta: number) => void) {
  const [habilitada, setHabilitada] = useState<number | null>(null); // fila que se puede arrastrar (solo mientras se pulsa su asa)
  const [desde, setDesde] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);

  const fin = () => {
    setDesde(null);
    setSobre(null);
    setHabilitada(null);
  };

  const propsFila = (i: number) => ({
    draggable: habilitada === i,
    onDragStart: (e: DragEvent) => {
      setDesde(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
    },
    onDragOver: (e: DragEvent) => {
      if (desde === null) return;
      e.preventDefault();
      setSobre(i);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (desde !== null && desde !== i) mover(desde, i);
      fin();
    },
    onDragEnd: fin,
  });

  const propsAsa = (i: number) => ({
    onMouseDown: () => setHabilitada(i),
    onMouseUp: () => setHabilitada(null),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        mover(i, i - 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        mover(i, i + 1);
      }
    },
  });

  // La fila sobre la que se está soltando (para marcarla).
  const marcada = (i: number) => desde !== null && sobre === i && desde !== i;

  return { propsFila, propsAsa, marcada, arrastrando: desde };
}
