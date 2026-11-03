"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIdioma } from "./useIdioma";

// Nombres en inglés de las tarifas y de los tipos de clase, que se escriben en Administración.
let cargado: Promise<Record<string, string>> | null = null;

function cargar(): Promise<Record<string, string>> {
  if (!cargado) {
    const supabase = createClient();
    cargado = Promise.all([supabase.from("tipos_clase").select("nombre, nombre_en"), supabase.from("tipos_bono").select("nombre, nombre_en")])
      .then((respuestas) => {
        const mapa: Record<string, string> = {};
        for (const r of respuestas) for (const f of (r.data ?? []) as { nombre: string; nombre_en: string | null }[]) if (f.nombre_en) mapa[f.nombre] = f.nombre_en;
        return mapa;
      })
      .catch(() => ({}));
  }
  return cargado;
}

// Devuelve una función que pasa el nombre de una tarifa o de una clase al inglés cuando la app está en inglés
// (y si no tiene nombre en inglés, deja el de siempre).
export function useNombresEn(): (nombre: string) => string {
  const [idioma] = useIdioma();
  const [mapa, setMapa] = useState<Record<string, string>>({});
  useEffect(() => {
    if (idioma !== "en") return;
    let vigente = true;
    cargar().then((m) => vigente && setMapa(m));
    return () => {
      vigente = false;
    };
  }, [idioma]);
  return (nombre: string) => (idioma === "en" ? (mapa[nombre] ?? nombre) : nombre);
}
