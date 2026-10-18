"use client";

import { useActionState } from "react";
import { altaAlumno, type Estado } from "./acciones";
import EnlaceCopiable from "./EnlaceCopiable";
import styles from "./admin.module.css";

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "online", etiqueta: "Entrenamiento online" },
];

export default function FormularioAlta() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(altaAlumno, {});

  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Dar de alta a un alumno</h2>
      <div className={styles.campo}>
        <label htmlFor="correo-alta">Correo del alumno</label>
        <input id="correo-alta" name="correo" type="email" required />
      </div>
      <fieldset className={styles.grupo}>
        <legend>Servicios</legend>
        {SERVICIOS.map((s) => (
          <label key={s.valor} className={styles.casilla}>
            <input type="checkbox" name="servicios" value={s.valor} />
            {s.etiqueta}
          </label>
        ))}
      </fieldset>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear alumno y generar enlace"}
      </button>
      {estado.mensaje && (
        <div role="status">
          <p className={styles.aviso}>{estado.mensaje}</p>
          {estado.enlace && <EnlaceCopiable enlace={estado.enlace} />}
        </div>
      )}
    </form>
  );
}
