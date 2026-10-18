"use client";

import { useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { emailValido } from "@/lib/validaciones";
import { createClient } from "@/lib/supabase/client";

export default function Recuperar() {
  const [idioma] = useIdioma();
  const t = textos[idioma];

  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValido(correo)) return setError(t.errorCampo);

    setCargando(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${location.origin}/auth/confirmar?next=/crear-contrasena`,
    });
    setCargando(false);
    // Siempre se muestra el mismo mensaje, exista o no el correo.
    setEnviado(true);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/entrar", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.recuperarTitulo}</h1>
        <p>{t.recuperarIntro}</p>
      </div>

      {enviado ? (
        <p className={styles.aviso} role="status">
          {t.recuperarEnviado}
        </p>
      ) : (
        <form className={styles.tarjeta} onSubmit={enviar} noValidate>
          <div className={styles.campo}>
            <label htmlFor="correo">{t.correo}</label>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className={styles.boton} type="submit" disabled={cargando}>
            {cargando ? t.cargando : t.recuperarBoton}
          </button>
        </form>
      )}
    </main>
  );
}
