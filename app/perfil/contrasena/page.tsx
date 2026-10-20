"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { useIdioma } from "../../useIdioma";
import estilos from "../perfil.module.css";
import { textosPerfil, type TextosPerfil } from "../textosPerfil";
import { createClient } from "@/lib/supabase/client";

type Mensaje = { ok: boolean; clave: keyof TextosPerfil };

export default function CambiarContrasena() {
  const [idioma] = useIdioma();
  const t = textosPerfil[idioma];
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (nueva.length < 8) return setMensaje({ ok: false, clave: "claveErrorCorta" });
    if (nueva !== repetida) return setMensaje({ ok: false, clave: "claveErrorIgual" });
    if (nueva === actual) return setMensaje({ ok: false, clave: "claveErrorMisma" });

    setGuardando(true);
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    const email = sesion.user?.email;
    if (!email) {
      setGuardando(false);
      return setMensaje({ ok: false, clave: "claveError" });
    }
    // Comprueba que la contraseña actual es la correcta antes de cambiarla.
    const { error: falloActual } = await supabase.auth.signInWithPassword({ email, password: actual });
    if (falloActual) {
      setGuardando(false);
      return setMensaje({ ok: false, clave: "claveErrorActual" });
    }
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setGuardando(false);
    if (error) return setMensaje({ ok: false, clave: "claveError" });
    setActual("");
    setNueva("");
    setRepetida("");
    setMensaje({ ok: true, clave: "claveOk" });
  }

  const campo = (id: string, etiqueta: string, valor: string, cambiarValor: (v: string) => void, auto: string) => (
    <div className={styles.campo}>
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type="password"
        autoComplete={auto}
        value={valor}
        onChange={(ev) => cambiarValor(ev.target.value)}
      />
    </div>
  );

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <Link href="/perfil" className={estilos.volver}>
        ← {t.volver}
      </Link>
      <form className={`${styles.tarjeta} ${estilos.seccion}`} onSubmit={cambiar} noValidate>
        <h2>{t.cambiarContrasena}</h2>
        {campo("clave-actual", t.claveActual, actual, setActual, "current-password")}
        {campo("clave-nueva", t.claveNueva, nueva, setNueva, "new-password")}
        {campo("clave-repetir", t.claveRepetir, repetida, setRepetida, "new-password")}
        {mensaje && (
          <p className={mensaje.ok ? styles.aviso : styles.error} role="alert">
            {t[mensaje.clave]}
          </p>
        )}
        <button type="submit" className={styles.boton} disabled={guardando}>
          {guardando ? t.cargando : t.cambiarContrasena}
        </button>
      </form>
    </main>
  );
}
