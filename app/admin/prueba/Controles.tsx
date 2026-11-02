"use client";

import { useState, useTransition } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { cambiarActivo, crearLink, nuevoCodigo } from "./acciones";
import estilos from "./prueba.module.css";

export default function ControlesLink({ link, activo }: { link: string | null; activo: boolean }) {
  const [estado, setEstado] = useState<Estado>({});
  const [copiado, setCopiado] = useState(false);
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    setEstado({});
    empezar(async () => setEstado(await accion()));
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setEstado({ error: "No se ha podido copiar. Selecciona el link y cópialo a mano." });
    }
  }

  return (
    <div className={styles.formularioInterno}>
      {!link ? (
        <>
          <p className={styles.ayuda}>Todavía no has creado el link. Al crearlo se genera un código, y el link queda apagado hasta que lo actives.</p>
          <button type="button" className={styles.boton} disabled={pendiente} onClick={() => ejecutar(crearLink)}>
            Crear el link
          </button>
        </>
      ) : (
        <>
          <div className={styles.campo}>
            <label htmlFor="link-prueba">Link para compartir <AyudaI texto="La dirección que le pasas a quien quiere probar una clase gratis. Al entrar se crea su cuenta de invitado/a." /></label>
            <input id="link-prueba" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className={estilos.botones}>
            <button type="button" className={styles.boton} onClick={copiar}>
              {copiado ? "¡Copiado!" : "Copiar el link"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className={`${styles.boton} ${styles.botonSecundario}`}>
              Ver cómo lo ve la gente
            </a>
          </div>

          <label className={styles.casilla}>
            <input type="checkbox" checked={activo} disabled={pendiente} onChange={(e) => ejecutar(() => cambiarActivo(e.target.checked))} />
            Link activado <AyudaI texto="Si lo apagas, nadie puede usar el link para apuntarse a una clase de prueba. Puedes volver a activarlo cuando quieras." />
          </label>

          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            disabled={pendiente}
            onClick={() => {
              if (window.confirm("¿Crear un código nuevo? El link anterior dejará de funcionar y tendrás que compartir el nuevo.")) ejecutar(nuevoCodigo);
            }}
          >
            Generar un código nuevo
          </button>
        </>
      )}
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
