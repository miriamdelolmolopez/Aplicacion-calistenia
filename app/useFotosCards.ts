"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

// Fotos que la administradora ha puesto a las tarjetas (tabla fotos_app, claves «card:…»). Son públicas.
const PREFIJO = "card:";
const VACIO: Record<string, string> = {};

let fotos: Record<string, string> = VACIO;
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((o) => o());
}

export function recargarFotosCards(): Promise<void> {
  cargando = (async () => {
    try {
      const { data } = await createClient().from("fotos_app").select("clave, url").like("clave", PREFIJO + "%");
      fotos = Object.fromEntries((data ?? []).map((f) => [f.clave.slice(PREFIJO.length), f.url as string]));
      avisar();
    } catch {
      // Sin conexión se ven las fotos de ejemplo.
    }
  })();
  return cargando;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (!cargando) void recargarFotosCards();
  return () => {
    oyentes.delete(oyente);
  };
}

// Todas las fotos de tarjetas (para listas donde no se puede llamar al gancho por tarjeta).
export function useFotosCards(): Record<string, string> {
  return useSyncExternalStore(suscribir, () => fotos, () => VACIO);
}

// Foto propia de una tarjeta, o null si no tiene (se usa entonces la de ejemplo).
export function useFotoCard(clave: string): string | null {
  const todas = useSyncExternalStore(suscribir, () => fotos, () => VACIO);
  return todas[clave] ?? null;
}
