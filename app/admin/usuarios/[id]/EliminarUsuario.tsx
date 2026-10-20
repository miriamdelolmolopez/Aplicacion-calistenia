"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../admin.module.css";
import { eliminarUsuario } from "../acciones";

// Elimina a una persona con todos sus datos. Pide confirmación escribiendo ELIMINAR.
export default function EliminarUsuario({ userId, nombre }: { userId: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setTrabajando(true);
    setError(null);
    const r = await eliminarUsuario(userId);
    setTrabajando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido eliminar.");
    router.push("/admin/usuarios");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAbierto(true)}>
        Eliminar usuario
      </button>
    );
  }

  return (
    <div className={styles.formularioInterno} role="alertdialog" aria-label="Confirmar eliminación">
      <p className={styles.error}>
        Vas a eliminar a <strong>{nombre}</strong>. No se puede deshacer.
      </p>
      <ul>
        <li>Se borran su cuenta, sus datos, reservas, bonos, entrenos, progreso, fotos y aceptaciones.</li>
        <li>Los pagos se conservan (con su nombre y DNI) por obligación fiscal.</li>
      </ul>
      <div className={styles.campo}>
        <label htmlFor="confirmar-borrado">Para confirmar, escribe ELIMINAR</label>
        <input
          id="confirmar-borrado"
          value={texto}
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <button
        type="button"
        className={styles.boton}
        disabled={trabajando || texto.trim().toUpperCase() !== "ELIMINAR"}
        onClick={borrar}
      >
        {trabajando ? "Eliminando…" : "Sí, eliminar para siempre"}
      </button>
      <button
        type="button"
        className={`${styles.boton} ${styles.botonSecundario}`}
        disabled={trabajando}
        onClick={() => {
          setAbierto(false);
          setTexto("");
          setError(null);
        }}
      >
        Cancelar
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
