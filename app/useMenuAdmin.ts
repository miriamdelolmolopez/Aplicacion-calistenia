"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { OPCIONES_MENU_ADMIN, type OpcionMenuAdmin } from "./opcionesMenuAdmin";

// Lo que la administradora elige se guarda en este navegador. Las alumnas no tienen nada de esto: su menú es fijo.
const CLAVE = "menuAdmin"; // qué opciones de la barra lateral se ven
const CLAVE_ORDEN = "menuAdminOrden"; // en qué orden
const CLAVE_BARRA = "barraAdmin"; // qué opciones salen en la barra de abajo (sin Inicio ni «Más»)
const EVENTO = "cambio-menu-admin";

export const MAX_BARRA = 5;
export const BARRA_POR_DEFECTO = ["/admin", "/admin/usuarios", "/admin/reservas", "/perfil"];

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(clave: string): string {
  try {
    return localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento no se puede recordar la elección.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function analizar<T>(crudo: string, defecto: T): T {
  try {
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

export function useMenuAdmin(): {
  visibles: OpcionMenuAdmin[]; // barra lateral, ya ordenada
  ordenadas: OpcionMenuAdmin[]; // todo el catálogo, en el orden elegido (para la pantalla de Ajustes)
  estaVisible: (o: OpcionMenuAdmin) => boolean;
  poner: (href: string, visible: boolean) => void;
  mover: (href: string, direccion: -1 | 1) => void;
  barra: OpcionMenuAdmin[]; // opciones de la barra de abajo, en orden
  disponiblesBarra: OpcionMenuAdmin[];
  ponerEnBarra: (href: string) => void;
  quitarDeBarra: (href: string) => void;
  moverEnBarra: (href: string, direccion: -1 | 1) => void;
} {
  const crudo = useSyncExternalStore(suscribir, () => leer(CLAVE), () => "");
  const crudoOrden = useSyncExternalStore(suscribir, () => leer(CLAVE_ORDEN), () => "");
  const crudoBarra = useSyncExternalStore(suscribir, () => leer(CLAVE_BARRA), () => "");

  const elegido = useMemo(() => analizar<Record<string, boolean>>(crudo, {}), [crudo]);
  const orden = useMemo(() => analizar<string[]>(crudoOrden, []), [crudoOrden]);
  const hrefsBarra = useMemo(() => analizar<string[]>(crudoBarra, BARRA_POR_DEFECTO), [crudoBarra]);

  const porHref = useMemo(() => new Map(OPCIONES_MENU_ADMIN.map((o) => [o.href, o])), []);

  // Catálogo en el orden elegido: primero lo que ya tiene sitio, después lo nuevo en su orden de siempre.
  const ordenadas = useMemo(() => {
    const conocidas = orden.filter((h) => porHref.has(h));
    const resto = OPCIONES_MENU_ADMIN.filter((o) => !conocidas.includes(o.href)).map((o) => o.href);
    return [...conocidas, ...resto].map((h) => porHref.get(h)!).filter((o) => !o.soloBarra);
  }, [orden, porHref]);

  const estaVisible = useCallback((o: OpcionMenuAdmin) => o.fijo || (elegido[o.href] ?? o.defecto), [elegido]);
  const visibles = useMemo(() => ordenadas.filter(estaVisible), [ordenadas, estaVisible]);

  const barra = useMemo(() => hrefsBarra.map((h) => porHref.get(h)).filter((o): o is OpcionMenuAdmin => !!o && o.href !== "/inicio").slice(0, MAX_BARRA), [hrefsBarra, porHref]);
  const disponiblesBarra = useMemo(() => OPCIONES_MENU_ADMIN.filter((o) => o.href !== "/inicio" && !barra.some((b) => b.href === o.href)), [barra]);

  const mueve = (lista: string[], href: string, direccion: -1 | 1): string[] => {
    const i = lista.indexOf(href);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= lista.length) return lista;
    const copia = [...lista];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  };

  return {
    visibles,
    ordenadas,
    estaVisible,
    poner: (href, visible) => guardar(CLAVE, { ...elegido, [href]: visible }),
    mover: (href, direccion) => guardar(CLAVE_ORDEN, mueve(ordenadas.map((o) => o.href), href, direccion)),
    barra,
    disponiblesBarra,
    ponerEnBarra: (href) => {
      if (barra.length < MAX_BARRA && !barra.some((b) => b.href === href)) guardar(CLAVE_BARRA, [...barra.map((b) => b.href), href]);
    },
    quitarDeBarra: (href) => guardar(CLAVE_BARRA, barra.map((b) => b.href).filter((h) => h !== href)),
    moverEnBarra: (href, direccion) => guardar(CLAVE_BARRA, mueve(barra.map((b) => b.href), href, direccion)),
  };
}
