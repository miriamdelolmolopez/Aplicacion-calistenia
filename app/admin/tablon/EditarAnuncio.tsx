"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { editarAnuncio } from "./acciones";

export type AnuncioEditable = { id: string; titulo: string; texto: string; enlace: string | null; audiencia: string; fijado: boolean; caduca: string; admite: boolean; maxPlazas: number | null };

// Formulario para cambiar un anuncio ya publicado. Va dentro del desplegable de cada anuncio.
export default function EditarAnuncio({ a, conOpcion }: { a: AnuncioEditable; conOpcion: boolean }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(editarAnuncio, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="id" value={a.id} />
      <div className={styles.campo}>
        <label htmlFor={`et-${a.id}`}>Título</label>
        <input id={`et-${a.id}`} name="titulo" defaultValue={a.titulo} maxLength={120} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ex-${a.id}`}>Texto</label>
        <textarea id={`ex-${a.id}`} name="texto" rows={5} defaultValue={a.texto} maxLength={2000} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ee-${a.id}`}>Enlace (opcional)</label>
        <input id={`ee-${a.id}`} name="enlace" defaultValue={a.enlace ?? ""} placeholder="https://… o /clases" maxLength={300} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ea-${a.id}`}>¿Quién lo ve?</label>
        <select id={`ea-${a.id}`} name="audiencia" defaultValue={a.audiencia}>
          <option value="activos">Solo alumnos activos (con tarifa en marcha)</option>
          <option value="todos">Todos (alumnos e invitados)</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ec-${a.id}`}>Desaparece el (opcional)</label>
        <input id={`ec-${a.id}`} name="caduca" type="date" defaultValue={a.caduca} />
      </div>
      {conOpcion && (
        <>
          <input type="hidden" name="opcion_apuntados" value="1" />
          <label className={styles.casilla}>
            <input type="checkbox" name="admite_apuntados" defaultChecked={a.admite} />
            Dejar que se apunten desde la app
          </label>
          <div className={styles.campo}>
            <label htmlFor={`em-${a.id}`}>Máximo de plazas (opcional)</label>
            <input id={`em-${a.id}`} name="max_plazas" type="number" min={1} step={1} defaultValue={a.maxPlazas ?? ""} placeholder="Sin límite" />
          </div>
        </>
      )}
      <label className={styles.casilla}>
        <input type="checkbox" name="fijado" defaultChecked={a.fijado} />
        Fijarlo arriba del tablón
      </label>
      <p className={styles.ayuda}>Al guardar los cambios no se vuelve a avisar a nadie.</p>
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
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
