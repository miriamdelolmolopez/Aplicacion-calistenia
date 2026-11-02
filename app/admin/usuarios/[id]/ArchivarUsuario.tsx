"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../admin.module.css";
import { archivarUsuario, desarchivarUsuario, eliminarUsuario } from "../acciones";

// Archivar a una persona (sus datos y pagos se conservan), recuperarla, o —solo si lo pide por ley— borrarla del todo.
export default function ArchivarUsuario({ userId, nombre, archivado }: { userId: string; nombre: string; archivado: boolean }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, destino?: string) {
    setTrabajando(true);
    setError(null);
    const r = await accion();
    setTrabajando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido hacer.");
    setConfirmando(false);
    if (destino) router.push(destino);
    router.refresh();
  }

  if (archivado) {
    return (
      <div className={styles.formularioInterno}>
        <p className={styles.aviso}>
          <strong>{nombre}</strong> está archivada: no sale en las listas ni puede entrar. Sus datos y pagos se conservan y salen en Descargar datos (CSV).
        </p>
        <button type="button" className={styles.boton} disabled={trabajando} onClick={() => ejecutar(() => desarchivarUsuario(userId))}>
          {trabajando ? "Recuperando…" : "Recuperar (desarchivar)"}
        </button>

        <details>
          <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 600 }}>Borrado definitivo (solo si lo pide por ley)</summary>
          <p className={styles.error}>
            Se borran su cuenta, sus datos, reservas, bonos, entrenos, progreso, fotos y aceptaciones. No se puede deshacer. Los pagos se conservan (con su nombre y DNI) por obligación fiscal.
          </p>
          <div className={styles.campo}>
            <label htmlFor="confirmar-borrado">Para confirmar, escribe ELIMINAR</label>
            <input id="confirmar-borrado" value={texto} autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
          </div>
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            disabled={trabajando || texto.trim().toUpperCase() !== "ELIMINAR"}
            onClick={() => ejecutar(() => eliminarUsuario(userId), "/admin/usuarios")}
          >
            {trabajando ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </details>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!confirmando) {
    return (
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(true)}>
        Archivar usuario
      </button>
    );
  }

  return (
    <div className={styles.formularioInterno} role="alertdialog" aria-label="Confirmar archivo">
      <p>
        Vas a archivar a <strong>{nombre}</strong>.
      </p>
      <ul>
        <li>Desaparece de las listas y no puede iniciar sesión.</li>
        <li>Se quitan sus reservas de clases que aún no han empezado.</li>
        <li>Sus datos, bonos y pagos se conservan y salen en Descargar datos (CSV). Puedes recuperarla cuando quieras.</li>
      </ul>
      <button type="button" className={styles.boton} disabled={trabajando} onClick={() => ejecutar(() => archivarUsuario(userId), "/admin/usuarios")}>
        {trabajando ? "Archivando…" : "Sí, archivar"}
      </button>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={() => setConfirmando(false)}>
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
