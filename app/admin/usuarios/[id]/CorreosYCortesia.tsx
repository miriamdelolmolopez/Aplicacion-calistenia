"use client";

import { useActionState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import { alargarCortesia } from "../acciones";

// Alargar cortesía: se elige hasta qué día y la app calcula los días. También reabre una tarifa que acaba de caducar.
export function AlargarCortesia({ userId, bonoId, hasta }: { userId: string; bonoId: string; hasta: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(alargarCortesia, {});
  return (
    <details>
      <summary className={styles.ayuda}>Alargar cortesía</summary>
      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="bonoId" value={bonoId} />
        <p className={styles.ayuda}>Ahora termina el {hasta.slice(8, 10) + "/" + hasta.slice(5, 7) + "/" + hasta.slice(0, 4)}.</p>
        <div className={styles.campo}>
          <label htmlFor={`co-${bonoId}`}>Alargarla hasta el día</label>
          <input id={`co-${bonoId}`} name="hasta" type="date" min={hasta} required />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`cn-${bonoId}`}>Motivo (opcional)</label>
          <input id={`cn-${bonoId}`} name="nota" maxLength={200} placeholder="Cortesía" />
        </div>
        <button type="submit" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Alargar cortesía"}
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
    </details>
  );
}
