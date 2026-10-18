"use client";

import { useActionState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import { guardarNota } from "../acciones";

export default function Notas({ userId, texto }: { userId: string; texto: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarNota, {});
  return (
    <form action={accion} className={`${estilos.bloque} ${estilos.nota}`}>
      <input type="hidden" name="userId" value={userId} />
      <textarea
        name="texto"
        defaultValue={texto}
        maxLength={4000}
        placeholder="Lesiones, objetivos, cosas que quieres recordar… Solo las ves tú."
        aria-label="Notas privadas"
      />
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar nota"}
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
