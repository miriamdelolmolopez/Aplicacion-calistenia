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
import { MAX_BARRA, useMenuAdmin } from "../useMenuAdmin";
import { useMiPerfil } from "../useMiPerfil";
import { usePreferencias } from "./usePreferencias";
import Cargando from "../Cargando";

export default function Ajustes() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const mi = useMiPerfil();
  const menu = useMenuAdmin();
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
        <>
          <section className={`${styles.tarjeta} ${estilos.seccion}`}>
            <h2>Barra lateral</h2>
            <p className={styles.ayuda}>
              Marca lo que quieres ver y cámbialo de orden con las flechas. Se guarda en este dispositivo: si usas otro, hay que elegirlo ahí también.
            </p>
            {menu.ordenadas.map((o, i) => (
              <div key={o.href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className={estilos.interruptor} style={{ flex: 1 }}>
                  <input type="checkbox" checked={menu.estaVisible(o)} disabled={o.fijo} onChange={(e) => menu.poner(o.href, e.target.checked)} />
                  <span>
                    {o.texto}
                    {o.fijo && " (siempre visible)"}
                  </span>
                </label>
                <button type="button" className={styles.botonSecundario} aria-label={`Subir ${o.texto}`} disabled={i === 0} onClick={() => menu.mover(o.href, -1)}>
                  ↑
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Bajar ${o.texto}`} disabled={i === menu.ordenadas.length - 1} onClick={() => menu.mover(o.href, 1)}>
                  ↓
                </button>
              </div>
            ))}
          </section>

          <section className={`${styles.tarjeta} ${estilos.seccion}`}>
            <h2>Barra de abajo</h2>
            <p className={styles.ayuda}>
              Elige hasta {MAX_BARRA} opciones y su orden. Inicio va siempre la primera y «Más» al final.
            </p>
            {menu.barra.map((o, i) => (
              <div key={o.href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ flex: 1 }}>{o.texto}</strong>
                <button type="button" className={styles.botonSecundario} aria-label={`Subir ${o.texto} en la barra`} disabled={i === 0} onClick={() => menu.moverEnBarra(o.href, -1)}>
                  ↑
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Bajar ${o.texto} en la barra`} disabled={i === menu.barra.length - 1} onClick={() => menu.moverEnBarra(o.href, 1)}>
                  ↓
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Quitar ${o.texto} de la barra`} onClick={() => menu.quitarDeBarra(o.href)}>
                  Quitar
                </button>
              </div>
            ))}
            {menu.barra.length < MAX_BARRA && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={styles.ayuda}>Añadir:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) menu.ponerEnBarra(e.target.value);
                  }}
                >
                  <option value="">Elige una opción…</option>
                  {menu.disponiblesBarra.map((o) => (
                    <option key={o.href} value={o.href}>
                      {o.texto}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        </>
      )}

      <nav className={estilos.lista}>
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
        <Link href="/ajustes/textos-legales" className={styles.boton}>
          {idioma === "en" ? "What I have accepted (PDF)" : "Lo que he aceptado (PDF)"}
        </Link>
      </section>
    </main>
  );
}
