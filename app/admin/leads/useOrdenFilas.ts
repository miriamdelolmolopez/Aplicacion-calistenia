"use client";

import { useSyncExternalStore } from "react";

// El orden de las filas de la lista de leads cuando se arrastran a mano (por los seis puntitos de cada fila).
// Se recuerda en este navegador. Al elegir «Ordenar» en una columna, el orden a mano se deja de usar (pero se conserva por si se vuelve a arrastrar).
const CLAVE = "leads-orden-filas";
const oyentes = new Set<() => void>();
const suscribir = (cb: () => void) => {
  oyentes.add(cb);
  return () => void oyentes.delete(cb);
};
const leer = () => {
  try {
    return localStorage.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
};
const escribir = (valor: string) => {
  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    // sin almacenamiento
  }
  oyentes.forEach((cb) => cb());
};

type Guardado = { ids: string[]; activo: boolean };

function interpretar(texto: string): Guardado {
  try {
    const v = JSON.parse(texto) as Guardado;
    if (Array.isArray(v.ids)) return { ids: v.ids.filter((x) => typeof x === "string"), activo: !!v.activo };
  } catch {
    // vacío o estropeado
  }
  return { ids: [], activo: false };
}

export function useOrdenFilas() {
  const texto = useSyncExternalStore(suscribir, leer, () => "");
  const { ids, activo } = interpretar(texto);
  return {
    ids,
    activo,
    guardar: (nuevos: string[]) => escribir(JSON.stringify({ ids: nuevos, activo: true })),
    desactivar: () => escribir(JSON.stringify({ ids, activo: false })),
  };
}
