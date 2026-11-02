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
    return localStorage.getItem(CLAVE) === "claro" ? "claro" : "oscuro";
  } catch {
    return "oscuro";
  }
}

// El tema se recuerda en este dispositivo. Un pequeño script del <head> lo aplica antes de pintar para que no parpadee.
export function useTema(): [Tema, (nuevo: Tema) => void] {
  const tema = useSyncExternalStore<Tema>(suscribir, leer, () => "oscuro");

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
// El tema oscuro es el de por defecto: solo se queda en claro quien lo ha elegido.
export const SCRIPT_TEMA = `try{if(localStorage.getItem("tema")!=="claro")document.documentElement.dataset.tema="oscuro"}catch(e){document.documentElement.dataset.tema="oscuro"}`;
