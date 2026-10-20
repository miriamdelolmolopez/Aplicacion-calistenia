"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { emailValido } from "@/lib/validaciones";
import { createClient } from "@/lib/supabase/client";

export default function Registro() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [imagen, setImagen] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValido(correo)) return setError(t.errorCampo);
    if (clave.length < 8) return setError(t.errorContrasenaCorta);

    setCargando(true);
    const supabase = createClient();
    const { data, error: fallo } = await supabase.auth.signUp({
      email: correo.trim(),
      password: clave,
      options: {
        data: { idioma, imagen },
        emailRedirectTo: `${location.origin}/auth/confirmar?next=/datos`,
      },
    });
    setCargando(false);

    if (fallo) return setError(t.errorGeneral);
    // Si Supabase no exige confirmar el correo, la sesión ya está abierta.
    if (data.session) return router.push("/datos");
    setEnviado(true);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{enviado ? t.registroEnviado : t.registroTitulo}</h1>
        {enviado && <p>{t.registroEnviadoTexto}</p>}
      </div>

      {!enviado && (
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
          <label className={styles.casilla}>
            <input type="checkbox" checked={imagen} onChange={(e) => setImagen(e.target.checked)} />
            <span>
              {idioma === "en"
                ? "I authorise the use of photos and videos in which I appear on social media and professional channels. I can withdraw this at any time."
                : "Autorizo el uso de fotos y vídeos en los que aparezca en redes sociales y canales profesionales. Puedo retirarlo cuando quiera."}
            </span>
          </label>
          <p className={styles.ayuda}>
            {idioma === "en" ? "By creating an account you accept the " : "Al crear tu cuenta aceptas los "}
            <Link href="/legal/terminos" target="_blank">
              {idioma === "en" ? "terms and conditions" : "términos y condiciones"}
            </Link>
            {idioma === "en" ? " and the " : " y la "}
            <Link href="/legal/privacidad" target="_blank">
              {idioma === "en" ? "privacy policy" : "política de privacidad"}
            </Link>
            .
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className={styles.boton} type="submit" disabled={cargando}>
            {cargando ? t.cargando : t.registroBoton}
          </button>
        </form>
      )}

      <div className={styles.enlaces}>
        <Link href="/entrar">{t.yaTienesCuenta}</Link>
      </div>
    </main>
  );
}
