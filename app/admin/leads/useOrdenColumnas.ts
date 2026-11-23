"use client";

import { useSyncExternalStore } from "react";

// El orden de las columnas de la lista de leads, para que cada persona las coloque como quiera arrastrándolas.
// Se recuerda en este navegador (si no se puede guardar, simplemente vuelve al orden de siempre).
const CLAVE = "leads-orden-columnas";
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

// Respeta lo guardado, ignora lo que ya no existe y deja al final las columnas nuevas.
function ordenar<T extends string>(guardado: string, todas: readonly T[]): T[] {
  const conocidas = guardado.split(",").filter((x): x is T => (todas as readonly string[]).includes(x));
  const unicas = [...new Set(conocidas)];
  return [...unicas, ...todas.filter((c) => !unicas.includes(c))];
}

export function useOrdenColumnas<T extends string>(todas: readonly T[]): [T[], (nuevo: T[]) => void] {
  const guardado = useSyncExternalStore(suscribir, leer, () => "");
  const cambiar = (nuevo: T[]) => {
    try {
      localStorage.setItem(CLAVE, nuevo.join(","));
    } catch {
      // sin almacenamiento
    }
    oyentes.forEach((cb) => cb());
  };
  return [ordenar(guardado, todas), cambiar];
}
