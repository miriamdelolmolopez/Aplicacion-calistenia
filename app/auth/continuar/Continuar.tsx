"use client";

import { useSearchParams } from "next/navigation";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";

const TIPOS = ["signup", "email", "invite", "recovery", "magiclink"];

export default function Continuar() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const params = useSearchParams();
  const token = params.get("token_hash") ?? "";
  const tipo = params.get("type") ?? "";
  const valido = /^[\w-]{10,200}$/.test(token) && TIPOS.includes(tipo);

  function continuar() {
    const destino = new URLSearchParams({ token_hash: token, type: tipo, ok: "1" });
    const siguiente = params.get("next");
    if (siguiente) destino.set("next", siguiente);
    // Navegación completa a propósito: /auth/confirmar es una ruta del servidor, no una página de la app.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/auth/confirmar?${destino.toString()}`;
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.continuarTitulo}</h1>
        <p>{valido ? t.continuarIntro : t.errorEnlace}</p>
      </div>
      <div className={styles.tarjeta}>
        {valido ? (
          <button className={styles.boton} type="button" onClick={continuar}>
            {t.continuarBoton}
          </button>
        ) : (
          <a className={styles.boton} href="/recuperar" style={{ textAlign: "center" }}>
            {t.pedirEnlaceNuevo}
          </a>
        )}
      </div>
    </main>
  );
}
