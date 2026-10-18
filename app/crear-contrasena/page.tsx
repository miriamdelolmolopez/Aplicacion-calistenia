"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { createClient } from "@/lib/supabase/client";

export default function CrearContrasena() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();

  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (clave.length < 8) return setError(t.errorContrasenaCorta);
    if (clave !== repetida) return setError(t.errorContrasenaIgual);

    setCargando(true);
    const supabase = createClient();
    const { error: fallo } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);

    if (fallo) return setError(t.errorGeneral);
    router.push("/inicio");
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.contrasenaTitulo}</h1>
        <p>{t.contrasenaIntro}</p>
      </div>

      <form className={styles.tarjeta} onSubmit={enviar} noValidate>
        <div className={styles.campo}>
          <label htmlFor="clave">{t.contrasena}</label>
          <input
            id="clave"
            type="password"
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <span className={styles.ayuda}>{t.contrasenaAyuda}</span>
        </div>
        <div className={styles.campo}>
          <label htmlFor="repetida">{t.repetirContrasena}</label>
          <input
            id="repetida"
            type="password"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.boton} type="submit" disabled={cargando}>
          {cargando ? t.cargando : t.contrasenaBoton}
        </button>
      </form>
    </main>
  );
}
