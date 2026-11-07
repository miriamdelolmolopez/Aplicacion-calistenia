"use client";

import { useSyncExternalStore } from "react";

const CLAVE = "comoId";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// «Ver como alumno/a»: Miriam mira la app como la vería esa persona. Vale lo que diga la dirección (?como=…) o, si no, lo guardado.
export function leerComo(): string | null {
  try {
    const p = new URLSearchParams(location.search).get("como");
    if (p && UUID.test(p)) return p;
    const v = sessionStorage.getItem(CLAVE);
    return v && UUID.test(v) ? v : null;
  } catch {
    return null;
  }
}

// Guarda (o quita) a quién se está viendo. La cookie sirve para que el servidor también lo sepa (solo lectura, bonos, tablón…).
export function fijarComo(id: string | null) {
  try {
    if (id) {
      sessionStorage.setItem(CLAVE, id);
      document.cookie = `como=${id}; path=/; SameSite=Lax`;
    } else {
      sessionStorage.removeItem(CLAVE);
      document.cookie = "como=; path=/; max-age=0";
    }
    window.dispatchEvent(new Event("como-cambio"));
  } catch {
    // Sin almacenamiento no se puede cambiar de vista.
  }
}

function suscribir(avisar: () => void) {
  window.addEventListener("como-cambio", avisar);
  return () => window.removeEventListener("como-cambio", avisar);
}

export function useComo(): string | null {
  return useSyncExternalStore(suscribir, leerComo, () => null);
}
