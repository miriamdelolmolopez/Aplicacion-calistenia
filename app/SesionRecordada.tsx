"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Si al entrar se quitó «Mantener la sesión iniciada», la sesión se cierra cuando se
// cierra el navegador o la app (la próxima vez hay que volver a entrar).
export default function SesionRecordada() {
  useEffect(() => {
    try {
      const noRecordar = localStorage.getItem("recordarSesion") === "no";
      const yaEnEstaVisita = sessionStorage.getItem("visitaActiva") === "1";
      if (noRecordar && !yaEnEstaVisita) {
        localStorage.removeItem("recordarSesion");
        createClient().auth.signOut();
      }
      sessionStorage.setItem("visitaActiva", "1");
    } catch {
      // Sin almacenamiento (modo privado, etc.): no se hace nada.
    }
  }, []);

  return null;
}
