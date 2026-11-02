"use client";

import { useActionState } from "react";
import { cambiarPersona, type Estado } from "./acciones";
import styles from "./admin.module.css";

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "taller", etiqueta: "Talleres (gente externa)" },
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

  return (
    <details className={styles.detalles}>
      <summary>Cambiar tipo de cuenta y servicios</summary>

      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="userId" value={persona.id} />
        <div className={styles.campo}>
          <label htmlFor={`rol-${persona.id}`}>Tipo de cuenta</label>
          <select id={`rol-${persona.id}`} name="rol" defaultValue={persona.rol}>
            <option value="alumno">Alumno</option>
            <option value="invitado">Invitado/a (clase de prueba)</option>
          </select>
        </div>
        <fieldset className={styles.grupo}>
          <legend>Servicios (solo para alumnos/as)</legend>
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

    </details>
  );
}
