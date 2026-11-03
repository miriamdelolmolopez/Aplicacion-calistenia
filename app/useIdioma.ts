"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Idioma } from "./textos";

const CLAVE = "idioma";
const EVENTO = "cambio-idioma";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "es" || guardado === "en") return guardado;
  } catch {}
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}

export function useIdioma(): [Idioma, (nuevo: Idioma) => void] {
  const idioma = useSyncExternalStore<Idioma>(suscribir, leer, () => "es");

  const cambiar = useCallback((nuevo: Idioma) => {
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {}
    document.documentElement.lang = nuevo;
    window.dispatchEvent(new Event(EVENTO));
    // Si hay una sesión iniciada, el idioma también se guarda en el perfil: es el de los correos que le mandamos.
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => (data.user ? supabase.from("profiles").update({ idioma: nuevo }).eq("id", data.user.id) : null))
      .catch(() => {});
  }, []);

  return [idioma, cambiar];
}
