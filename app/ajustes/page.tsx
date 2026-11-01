"use client";

import Link from "next/link";
import { useState } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import { pedirBorradoCuenta } from "../perfil/acciones";
import estilos from "../perfil/perfil.module.css";
import { textos } from "../textos";
import { IDIOMAS, type Idioma } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import { usePreferencias } from "./usePreferencias";
import Cargando from "../Cargando";

export default function Ajustes() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const mi = useMiPerfil();
  const { pref, setPref } = usePreferencias();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(false);

  if (!pref) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/perfil", texto: "volver" }} />
        <Cargando />
      </main>
    );
  }

  async function pedirBorrado() {
    setError(false);
    const r = await pedirBorradoCuenta();
    setConfirmando(false);
    if (!r.ok) return setError(true);
    setPref((p) => (p ? { ...p, borradoPedido: true } : p));
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/perfil", texto: "volver" }} />
      <CabeceraFoto foto="pino" titulo={t.ajustesTitulo} />

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.idioma}</h2>
        <select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nombre}
            </option>
          ))}
        </select>
      </section>

      {typeof mi === "object" && mi !== null && mi.rolReal === "admin" && (
        <nav className={estilos.lista} style={{ marginBottom: 12 }}>
          <Link href="/ajustes/barra-lateral" className={estilos.fila}>
            <span aria-hidden="true">☰</span>
            <span className={estilos.filaTexto}>Barra lateral</span>
            <span aria-hidden="true">›</span>
          </Link>
          <Link href="/ajustes/barra-inferior" className={estilos.fila}>
            <span aria-hidden="true">▭</span>
            <span className={estilos.filaTexto}>Barra de abajo</span>
            <span aria-hidden="true">›</span>
          </Link>
        </nav>
      )}

      <nav className={estilos.lista} style={{ marginBottom: 12 }}>
        <Link href="/ajustes/notificaciones" className={estilos.fila}>
          <span aria-hidden="true">🔔</span>
          <span className={estilos.filaTexto}>{idioma === "en" ? "Notifications" : "Notificaciones"}</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href="/ajustes/privacidad" className={estilos.fila}>
          <span aria-hidden="true">🔒</span>
          <span className={estilos.filaTexto}>{t.privacidadTitulo}</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href="/ajustes/textos-legales" className={estilos.fila}>
          <span aria-hidden="true">📄</span>
          <span className={estilos.filaTexto}>{idioma === "en" ? "My legal texts" : "Mis textos legales"}</span>
          <span aria-hidden="true">›</span>
        </Link>
      </nav>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.borrarCuentaTitulo}</h2>
        <p className={styles.ayuda}>{t.borrarCuentaTexto}</p>
        {pref.borradoPedido ? (
          <p className={styles.aviso}>{t.borradoPendiente}</p>
        ) : confirmando ? (
          <>
            <p className={styles.error}>{t.confirmarBorrado}</p>
            <button type="button" className={styles.boton} onClick={pedirBorrado}>
              {t.pedirBorrado}
            </button>
            <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(false)}>
              {t.noDescartar}
            </button>
          </>
        ) : (
          <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(true)}>
            {t.pedirBorrado}
          </button>
        )}
        {error && <p className={styles.error}>{t.errorGeneral}</p>}
      </section>
      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{idioma === "en" ? "Legal" : "Textos legales"}</h2>
        <p className={styles.ayuda}>
          <Link href="/legal/terminos">{idioma === "en" ? "Terms and conditions" : "Términos y condiciones"}</Link>
          {" · "}
          <Link href="/legal/privacidad">{idioma === "en" ? "Privacy policy" : "Política de privacidad"}</Link>
          {" · "}
          <Link href="/legal/aviso-legal">{idioma === "en" ? "Legal notice" : "Aviso legal"}</Link>
          {" · "}
          <Link href="/legal/cookies">Cookies</Link>
        </p>
      </section>
    </main>
  );
}
