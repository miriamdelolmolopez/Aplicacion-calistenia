"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Tema = "claro" | "oscuro";
const CLAVE = "tema";
const EVENTO = "cambio-tema";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(): Tema {
  try {
    return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

// El tema se recuerda en este dispositivo. Un pequeño script del <head> lo aplica antes de pintar para que no parpadee.
export function useTema(): [Tema, (nuevo: Tema) => void] {
  const tema = useSyncExternalStore<Tema>(suscribir, leer, () => "claro");

  const cambiar = useCallback((nuevo: Tema) => {
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {}
    document.documentElement.dataset.tema = nuevo;
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return [tema, cambiar];
}

// Texto del script que va en el <head> (se ejecuta antes de que se vea nada).
export const SCRIPT_TEMA = `try{if(localStorage.getItem("tema")==="oscuro")document.documentElement.dataset.tema="oscuro"}catch(e){}`;
