"use client";

import { useActionState, useState, useTransition } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import { alargarCortesia, cambiarSinCorreos } from "../acciones";

// Interruptor «No enviarle correos»: la app deja de mandarle cualquier correo a esa persona.
export function InterruptorCorreos({ userId, inicial }: { userId: string; inicial: boolean }) {
  const [activado, setActivado] = useState(inicial);
  const [estado, setEstado] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function cambiar(valor: boolean) {
    setActivado(valor);
    setEstado({});
    empezar(async () => {
      const r = await cambiarSinCorreos(userId, valor);
      setEstado(r);
      if (r.error) setActivado(!valor);
    });
  }

  return (
    <div className={styles.formularioInterno}>
      <label className={styles.casilla}>
        <input type="checkbox" checked={activado} disabled={pendiente} onChange={(e) => cambiar(e.target.checked)} />
        No enviarle correos
      </label>
      <p className={styles.ayuda}>
        Con esto activado la app no le manda ningún correo (recordatorios, avisos del bono, cumpleaños, confirmaciones). Los avisos dentro de la app siguen igual.
      </p>
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
