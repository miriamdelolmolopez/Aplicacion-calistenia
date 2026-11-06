"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { publicarAnuncio } from "./acciones";

export default function FormularioAnuncio() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(publicarAnuncio, {});
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.mensaje) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={accion} className={styles.tarjeta}>
      <h2>Nuevo anuncio</h2>
      <div className={styles.campo}>
        <label htmlFor="an-titulo">Título</label>
        <input id="an-titulo" name="titulo" maxLength={120} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="an-texto">Texto</label>
        <textarea id="an-texto" name="texto" rows={5} maxLength={2000} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="an-enlace">Enlace (opcional)</label>
        <input id="an-enlace" name="enlace" placeholder="https://… o /clases" maxLength={300} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="an-aud">¿Quién lo ve?</label>
        <select id="an-aud" name="audiencia" defaultValue="activos">
          <option value="activos">Solo alumnos activos (con tarifa en marcha)</option>
          <option value="todos">Todos (alumnos e invitados)</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="an-caduca">Desaparece el (opcional)</label>
        <input id="an-caduca" name="caduca" type="date" />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="fijado" />
        Fijarlo arriba del tablón
      </label>
      <label className={styles.casilla}>
        <input type="checkbox" name="avisar_app" defaultChecked />
        Avisar con una notificación en la app y en el móvil
      </label>
      <label className={styles.casilla}>
        <input type="checkbox" name="avisar_correo" />
        Avisar también por correo
      </label>
      <p className={styles.ayuda}>Cada persona puede desactivar los avisos de anuncios en Ajustes → Notificaciones.</p>
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
        {pendiente ? "Publicando…" : "Publicar anuncio"}
      </button>
    </form>
  );
}
