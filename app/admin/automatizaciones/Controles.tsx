"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { guardarAutomatizacion } from "./acciones";

export type Auto = {
  clave: string;
  activa: boolean;
  dias: number;
  asunto_es: string;
  mensaje_es: string;
  asunto_en: string;
  mensaje_en: string;
};

export function FormularioAutomatizacion({ auto, titulo, cuando, variables }: { auto: Auto; titulo: string; cuando: string; variables: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarAutomatizacion, {});
  const { ref, alEnviar } = useEnvio(accion, estado, false);
  const p = auto.clave;

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      <input type="hidden" name="clave" value={auto.clave} />
      <h2>{titulo}</h2>
      <p className={styles.ayuda}>{cuando}</p>
      <label className={styles.casilla}>
        <input type="checkbox" name="activa" defaultChecked={auto.activa} />
        <span>Activada</span>
      </label>

      {auto.clave === "bono_caduca" && (
        <div className={styles.campo}>
          <label htmlFor={`a-d-${p}`}>Días de antelación</label>
          <input id={`a-d-${p}`} name="dias" type="number" min={1} max={60} required defaultValue={auto.dias} />
        </div>
      )}

      <details className={styles.detalles}>
        <summary>Cambiar el texto del correo</summary>
        <p className={styles.ayuda}>
          Puedes poner estas palabras entre llaves y se sustituyen solas: {variables}. Una línea en blanco separa párrafos.
        </p>
        <div className={styles.campo}>
          <label htmlFor={`a-ae-${p}`}>Asunto (español)</label>
          <input id={`a-ae-${p}`} name="asunto_es" required maxLength={150} defaultValue={auto.asunto_es} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`a-me-${p}`}>Mensaje (español)</label>
          <textarea id={`a-me-${p}`} name="mensaje_es" required rows={6} maxLength={3000} defaultValue={auto.mensaje_es} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`a-an-${p}`}>Asunto (inglés)</label>
          <input id={`a-an-${p}`} name="asunto_en" required maxLength={150} defaultValue={auto.asunto_en} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`a-mn-${p}`}>Mensaje (inglés)</label>
          <textarea id={`a-mn-${p}`} name="mensaje_en" required rows={6} maxLength={3000} defaultValue={auto.mensaje_en} />
        </div>
      </details>

      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
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
    </form>
  );
}
