"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { OPCIONES_MENU_ADMIN, type OpcionMenuAdmin } from "./opcionesMenuAdmin";

const CLAVE = "menuAdmin";
const EVENTO = "cambio-menu-admin";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(): string {
  try {
    return localStorage.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
}

// Qué opciones de la barra lateral ve la administradora. Lo que ella elige se guarda en este navegador.
export function useMenuAdmin(): {
  visibles: OpcionMenuAdmin[];
  estaVisible: (o: OpcionMenuAdmin) => boolean;
  poner: (href: string, visible: boolean) => void;
} {
  const crudo = useSyncExternalStore(suscribir, leer, () => "");
  const elegido = useMemo<Record<string, boolean>>(() => {
    try {
      return crudo ? JSON.parse(crudo) : {};
    } catch {
      return {};
    }
  }, [crudo]);

  const estaVisible = useCallback((o: OpcionMenuAdmin) => o.fijo || (elegido[o.href] ?? o.defecto), [elegido]);
  const visibles = useMemo(() => OPCIONES_MENU_ADMIN.filter(estaVisible), [estaVisible]);

  const guardar = (nuevo: Record<string, boolean>) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    } catch {
      // Sin almacenamiento no se puede recordar la elección.
    }
    window.dispatchEvent(new Event(EVENTO));
  };

  return {
    visibles,
    estaVisible,
    poner: (href, visible) => guardar({ ...elegido, [href]: visible }),
  };
}
