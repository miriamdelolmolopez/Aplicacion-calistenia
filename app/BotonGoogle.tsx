"use client";

import { useState } from "react";
import estilos from "./BotonGoogle.module.css";
import { useIdioma } from "./useIdioma";
import { createClient } from "@/lib/supabase/client";

// «Continuar con Google»: sirve para entrar y para crear la cuenta. Quien entra por primera vez
// pasa por «Tus datos» (Inicio la lleva allí), igual que con el correo.
export default function BotonGoogle() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  async function entrar() {
    setError(false);
    setCargando(true);
    const { error: fallo } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/confirmar?next=/inicio` },
    });
    if (fallo) {
      setError(true);
      setCargando(false);
    }
  }

  return (
    <>
      <div className={estilos.separador}>{en ? "or" : "o"}</div>
      <button type="button" className={estilos.boton} onClick={entrar} disabled={cargando}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {cargando ? (en ? "Loading…" : "Cargando…") : en ? "Continue with Google" : "Continuar con Google"}
      </button>
      {error && (
        <p className={estilos.error} role="alert">
          {en ? "Google sign-in is not available right now." : "Entrar con Google no está disponible ahora mismo."}
        </p>
      )}
    </>
  );
}
