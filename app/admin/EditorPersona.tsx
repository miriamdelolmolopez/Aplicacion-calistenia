"use client";

import { useActionState } from "react";
import { cambiarPersona, enlaceNuevo, type Estado } from "./acciones";
import EnlaceCopiable from "./EnlaceCopiable";
import styles from "./admin.module.css";

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "online", etiqueta: "Entrenamiento online" },
];

type Persona = {
  id: string;
  email: string;
  rol: string;
  servicios: string[];
};

export default function EditorPersona({ persona }: { persona: Persona }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarPersona, {});
  const [estadoEnlace, accionEnlace, pendienteEnlace] = useActionState<Estado, FormData>(
    enlaceNuevo,
    {},
  );

  return (
    <details className={styles.detalles}>
      <summary>Editar</summary>

      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="userId" value={persona.id} />
        <div className={styles.campo}>
          <label htmlFor={`rol-${persona.id}`}>Tipo de cuenta</label>
          <select id={`rol-${persona.id}`} name="rol" defaultValue={persona.rol}>
            <option value="alumno">Alumno</option>
            <option value="invitado">Invitado (clase de prueba)</option>
          </select>
        </div>
        <fieldset className={styles.grupo}>
          <legend>Servicios (solo para alumnos)</legend>
          {SERVICIOS.map((s) => (
            <label key={s.valor} className={styles.casilla}>
              <input
                type="checkbox"
                name="servicios"
                value={s.valor}
                defaultChecked={persona.servicios.includes(s.valor)}
              />
              {s.etiqueta}
            </label>
          ))}
        </fieldset>
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
        <button className={styles.boton} type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <form action={accionEnlace} className={styles.formularioInterno}>
        <input type="hidden" name="correo" value={persona.email} />
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          disabled={pendienteEnlace}
        >
          {pendienteEnlace ? "Generando…" : "Generar enlace nuevo de acceso"}
        </button>
        {estadoEnlace.error && (
          <p className={styles.error} role="alert">
            {estadoEnlace.error}
          </p>
        )}
        {estadoEnlace.mensaje && (
          <div role="status">
            <p className={styles.aviso}>{estadoEnlace.mensaje}</p>
            {estadoEnlace.enlace && <EnlaceCopiable enlace={estadoEnlace.enlace} />}
          </div>
        )}
      </form>
    </details>
  );
}
