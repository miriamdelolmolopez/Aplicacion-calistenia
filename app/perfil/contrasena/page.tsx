"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { textos, type ClaveTexto } from "../../textos";
import { useIdioma } from "../../useIdioma";
import estilos from "../perfil.module.css";
import { createClient } from "@/lib/supabase/client";

export default function CambiarContrasena() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; clave: ClaveTexto } | null>(null);

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (clave.length < 8) return setMensaje({ ok: false, clave: "errorContrasenaCorta" });
    const { error } = await createClient().auth.updateUser({ password: clave });
    if (error) return setMensaje({ ok: false, clave: "errorGeneral" });
    setClave("");
    setMensaje({ ok: true, clave: "contrasenaCambiada" });
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <Link href="/perfil" className={estilos.volver}>
        ← {t.perfilTitulo}
      </Link>
      <form className={`${styles.tarjeta} ${estilos.seccion}`} onSubmit={cambiar} noValidate>
        <h2>{t.cambiarContrasena}</h2>
        <div className={styles.campo}>
          <label htmlFor="clave-nueva">{t.contrasenaNueva}</label>
          <input
            id="clave-nueva"
            type="password"
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </div>
        {mensaje && (
          <p className={mensaje.ok ? styles.aviso : styles.error} role="alert">
            {t[mensaje.clave]}
          </p>
        )}
        <button type="submit" className={styles.boton}>
          {t.cambiarContrasena}
        </button>
      </form>
    </main>
  );
}
