"use client";

import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { guardarFormaPago } from "./acciones";

export type Forma = { clave: string; nombre: string; activa: boolean; orden: number };

// Crear (sin forma) o editar (con forma) una forma de pago.
export function FormularioForma({ forma, alTerminar }: { forma?: Forma; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarFormaPago, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !forma);
  const p = forma?.clave ?? "nueva";

  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      {forma && <input type="hidden" name="clave" value={forma.clave} />}
      <div className={styles.campo}>
        <label htmlFor={`fp-n-${p}`}>Nombre</label>
        <input id={`fp-n-${p}`} name="nombre" required maxLength={40} defaultValue={forma?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`fp-o-${p}`}>Orden (1 sale primero)</label>
        <input id={`fp-o-${p}`} name="orden" type="number" min={0} max={999} defaultValue={forma?.orden ?? 0} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activa" defaultChecked={forma?.activa ?? true} />
        <span>Activa (si la desmarcas, no sale al cobrar; los pagos antiguos se conservan)</span>
      </label>
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : forma ? "Guardar" : "Crear"}
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
