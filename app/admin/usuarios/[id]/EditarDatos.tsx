"use client";

import { useActionState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import { guardarDatosPersona } from "../acciones";

export type DatosEditables = {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  telefono: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  idioma: string | null;
  alumno_desde: string | null;
};

// Miriam rellena o corrige los datos de una persona.
export default function EditarDatos({ datos, esAlumna }: { datos: DatosEditables; esAlumna: boolean }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarDatosPersona, {});
  const campo = (id: string, etiqueta: string, nombre: string, valor: string | null, tipo = "text", max = 120) => (
    <div className={styles.campo}>
      <label htmlFor={`${id}-${datos.id}`}>{etiqueta}</label>
      <input id={`${id}-${datos.id}`} name={nombre} type={tipo} defaultValue={valor ?? ""} maxLength={tipo === "date" ? undefined : max} />
    </div>
  );
  return (
    <details className={styles.detalles}>
      <summary>Rellenar o corregir sus datos</summary>
      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="userId" value={datos.id} />
        {campo("nom", "Nombre", "nombre", datos.nombre, "text", 80)}
        {campo("ape", "Apellidos", "apellidos", datos.apellidos)}
        {campo("tel", "Teléfono", "telefono", datos.telefono, "tel", 30)}
        {campo("dni", "DNI / NIE", "dni", datos.dni, "text", 20)}
        {campo("fn", "Fecha de nacimiento", "fecha_nacimiento", datos.fecha_nacimiento, "date")}
        <div className={styles.campo}>
          <label htmlFor={`sx-${datos.id}`}>Sexo</label>
          <select id={`sx-${datos.id}`} name="sexo" defaultValue={datos.sexo ?? ""}>
            <option value="">Sin indicar</option>
            <option value="mujer">Mujer</option>
            <option value="hombre">Hombre</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        {campo("emn", "Contacto de emergencia (nombre)", "em_nombre", datos.contacto_emergencia_nombre, "text", 80)}
        {campo("emt", "Contacto de emergencia (teléfono)", "em_telefono", datos.contacto_emergencia_telefono, "tel", 30)}
        <div className={styles.campo}>
          <label htmlFor={`id-${datos.id}`}>Idioma</label>
          <select id={`id-${datos.id}`} name="idioma" defaultValue={datos.idioma === "en" ? "en" : "es"}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </div>
        {esAlumna && (
          <>
            {campo("ad", "Alumno/a desde", "alumno_desde", datos.alumno_desde, "date")}
            <p className={styles.ayuda}>La fecha en que empezó con vosotras. La automatización de aniversario cuenta desde aquí; si la dejas vacía, cuenta desde que creó la cuenta.</p>
          </>
        )}
        <button type="submit" className={styles.boton} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar datos"}
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
    </details>
  );
}
