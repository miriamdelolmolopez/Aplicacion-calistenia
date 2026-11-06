"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import { anadirPersona } from "./acciones";
import { TIPOS_PERSONA } from "./tipos";

export default function FormularioPersona() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anadirPersona, {});
  const [tipos, setTipos] = useState<string[]>([]);
  const [bloquea, setBloquea] = useState<boolean>(true);
  const formulario = useRef<HTMLFormElement>(null);
  // Al guardar bien, el formulario se vacía (las casillas se reinician aquí y los campos de texto en el efecto).
  const [visto, setVisto] = useState(estado);
  if (estado !== visto) {
    setVisto(estado);
    if (estado.mensaje) {
      setTipos([]);
      setBloquea(true);
    }
  }
  useEffect(() => {
    if (estado.mensaje) formulario.current?.reset();
  }, [estado]);

  function marcar(valor: string, puesto: boolean) {
    const nuevos = puesto ? [...tipos, valor] : tipos.filter((x) => x !== valor);
    setTipos(nuevos);
    // Por defecto no puede hacer la prueba si alguno de sus tipos la bloquea.
    if (nuevos.length > 0) setBloquea(nuevos.some((x) => TIPOS_PERSONA.find((p) => p.valor === x)?.bloquea ?? true));
  }

  return (
    <form ref={formulario} action={accion} className={styles.tarjeta}>
      <h2>Añadir persona</h2>
      <p className={styles.ayuda}>No se crea ninguna cuenta ni se le envía ningún correo. Basta con rellenar uno de los tres datos (cuantos más, mejor).</p>
      <fieldset className={styles.grupo}>
        <legend>¿Qué era? (marca todas las que tuvo)</legend>
        {TIPOS_PERSONA.map((p) => (
          <label key={p.valor} className={styles.casilla}>
            <input type="checkbox" name="tipos" value={p.valor} checked={tipos.includes(p.valor)} onChange={(ev) => marcar(p.valor, ev.target.checked)} />
            {p.texto}
          </label>
        ))}
      </fieldset>
      <div className={styles.campo}>
        <label htmlFor="pe-nombre">Nombre (opcional)</label>
        <input id="pe-nombre" name="nombre" maxLength={120} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="pe-correo">Correo</label>
        <input id="pe-correo" name="correo" type="email" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="pe-dni">DNI / NIE</label>
        <input id="pe-dni" name="dni" maxLength={20} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="pe-tel">Teléfono</label>
        <input id="pe-tel" name="telefono" type="tel" maxLength={30} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="pe-nota">Nota (opcional)</label>
        <input id="pe-nota" name="nota" maxLength={200} placeholder="Por ejemplo: entrenó con ella en 2024" />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="bloquea" checked={bloquea} onChange={(e) => setBloquea(e.target.checked)} />
        No puede hacer la clase de prueba gratis
      </label>
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
        {pendiente ? "Guardando…" : "Añadir al registro"}
      </button>
    </form>
  );
}
