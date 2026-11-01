"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import BotonGoogle from "../BotonGoogle";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { emailValido } from "@/lib/validaciones";
import { createClient } from "@/lib/supabase/client";

function Formulario() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const enlaceMalo = useSearchParams().get("error") === "enlace";
  const registroCerrado = useSearchParams().get("error") === "cerrado";

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValido(correo) || !clave) return setError(t.errorCampo);

    setCargando(true);
    const supabase = createClient();
    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });
    setCargando(false);

    if (fallo) return setError(t.errorCredenciales);
    router.push("/inicio");
  }

  return (
    <>
      <div className={styles.cabecera}>
        <h1>{t.entrarTitulo}</h1>
      </div>

      {registroCerrado && (
        <p className={styles.aviso} role="alert">
          {idioma === "en" ? "Sign-up is closed: this app is only for Miriam’s students. Message her on WhatsApp." : "El registro está cerrado: esta app es solo para las alumnas de Miriam. Escríbele por WhatsApp."}
        </p>
      )}

      {enlaceMalo && (
        <p className={styles.aviso} role="alert">
          {t.errorEnlace}
        </p>
      )}

      <form className={styles.tarjeta} onSubmit={enviar} noValidate>
        <div className={styles.campo}>
          <label htmlFor="correo">{t.correo}</label>
          <input
            id="correo"
            name="email"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor="clave">{t.contrasena}</label>
          <input
            id="clave"
            name="password"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.boton} type="submit" disabled={cargando}>
          {cargando ? t.cargando : t.entrarBoton}
        </button>
        <BotonGoogle />
      </form>

      <div className={styles.enlaces}>
        <Link href="/recuperar">{t.olvidaste}</Link>
        <span aria-hidden="true">{idioma === "en" ? "or" : "o"}</span>
        <Link href="/registro">{t.crearCuenta}</Link>
      </div>
    </>
  );
}

export default function Entrar() {
  return (
    <main className={styles.pagina}>
      <div className={styles.fondoEntrar} aria-hidden="true" />
      <BarraSuperior izquierda={{ href: "/", texto: "volver" }} />
      <Suspense>
        <Formulario />
      </Suspense>
    </main>
  );
}
