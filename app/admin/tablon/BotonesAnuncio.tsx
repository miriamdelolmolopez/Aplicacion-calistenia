"use client";

import { useState, useTransition } from "react";
import styles from "../admin.module.css";
import { fijarAnuncio, quitarAnuncio } from "./acciones";

export default function BotonesAnuncio({ id, fijado }: { id: string; fijado: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, empezar] = useTransition();
  if (confirmando) {
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span className={styles.ayuda}>¿Quitar el anuncio?</span>
        <button type="button" className={styles.boton} disabled={pendiente} onClick={() => empezar(async () => void (await quitarAnuncio(id)))}>
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
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente} onClick={() => empezar(async () => void (await fijarAnuncio(id, !fijado)))}>
        {fijado ? "Quitar de fijados" : "Fijar"}
      </button>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(true)}>
        Quitar
      </button>
    </span>
  );
}
