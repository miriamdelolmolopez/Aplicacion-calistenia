"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { borrarMaterial, crearMaterial, editarMaterial } from "./acciones";

export type MaterialFila = { id: string; nombre: string; nombre_en: string | null; activo: boolean; usos: number };

function Mensajes({ estado }: { estado: Estado }) {
  return (
    <>
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
    </>
  );
}

function FilaMaterial({ m }: { m: MaterialFila }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(editarMaterial, {});
  const { ref, alEnviar } = useEnvio(accion, estado, false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    const aviso =
      m.usos > 0
        ? `«${m.nombre}» está en ${m.usos} ${m.usos === 1 ? "ejercicio" : "ejercicios"}. Se quitará de ellos. ¿Borrarlo? No se puede deshacer.`
        : `¿Borrar «${m.nombre}»? No se puede deshacer.`;
    if (!confirm(aviso)) return;
    setBorrando(true);
    const r = await borrarMaterial(m.id);
    setBorrando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido borrar.");
    router.refresh();
  }

  return (
    <li className={styles.persona}>
      <details className={styles.detalles}>
        <summary>
          {m.nombre}
          {m.activo ? "" : " · oculto"} · en {m.usos} {m.usos === 1 ? "ejercicio" : "ejercicios"}
        </summary>
        <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={m.id} />
          <div className={styles.campo}>
            <label htmlFor={`mn-${m.id}`}>Nombre</label>
            <input id={`mn-${m.id}`} name="nombre" required maxLength={60} defaultValue={m.nombre} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`me-${m.id}`}>Nombre en inglés (opcional)</label>
            <input id={`me-${m.id}`} name="nombre_en" maxLength={60} defaultValue={m.nombre_en ?? ""} />
          </div>
          <label className={styles.casilla}>
            <input type="checkbox" name="activo" defaultChecked={m.activo} />
            Visible al elegir material (si lo quitas, no sale en la lista, pero se conserva en los ejercicios)
          </label>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar cambios"}
          </button>
          <Mensajes estado={estado} />
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            disabled={borrando}
            onClick={borrar}
          >
            {borrando ? "Borrando…" : "Borrar material"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </details>
    </li>
  );
}

function NuevoMaterial() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearMaterial, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);
  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      <h2>Añadir material</h2>
      <div className={styles.campo}>
        <label htmlFor="material-nombre">Nombre</label>
        <input id="material-nombre" name="nombre" required maxLength={60} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="material-nombre-en">Nombre en inglés (opcional)</label>
        <input id="material-nombre-en" name="nombre_en" maxLength={60} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Añadir material"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

// Pestaña «Material»: añadir, editar y borrar el material que se elige en los ejercicios.
export default function GestionMaterial({ materiales }: { materiales: MaterialFila[] }) {
  return (
    <>
      <NuevoMaterial />
      <section className={styles.tarjeta}>
        <h2>Material ({materiales.length})</h2>
        <p className={styles.ayuda}>Pulsa uno para cambiarle el nombre, ocultarlo o borrarlo.</p>
        {materiales.length === 0 && <p className={styles.ayuda}>Todavía no hay material.</p>}
        <ul className={styles.lista}>
          {materiales.map((m) => (
            <FilaMaterial key={m.id} m={m} />
          ))}
        </ul>
      </section>
    </>
  );
}
