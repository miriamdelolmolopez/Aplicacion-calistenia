"use client";

import { useState, useTransition } from "react";
import styles from "../../admin.module.css";
import { cambiarBloqueo, quitarPersona } from "./acciones";

// Botones de cada persona del registro: permitir o bloquear su clase de prueba, y quitarla.
export default function AccionesPersona({ id, bloquea }: { id: string; bloquea: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, empezar] = useTransition();

  if (confirmando) {
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span className={styles.ayuda}>¿Quitar del registro?</span>
        <button type="button" className={styles.boton} disabled={pendiente} onClick={() => empezar(async () => void (await quitarPersona(id)))}>
          Sí, quitar
        </button>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(false)}>
          No
        </button>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente} onClick={() => empezar(async () => void (await cambiarBloqueo(id, !bloquea)))}>
        {bloquea ? "Permitir su prueba" : "Bloquear su prueba"}
      </button>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(true)}>
        Quitar
      </button>
    </span>
  );
}
