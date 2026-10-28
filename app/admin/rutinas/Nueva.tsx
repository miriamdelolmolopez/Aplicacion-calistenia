"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { crearRutina } from "./acciones";

export type OpcionAlumno = { id: string; texto: string };
export type OpcionRutina = { id: string; texto: string };

// Formulario para crear una rutina (vacía, para un alumno o como plantilla) o copiar una existente.
export function NuevaRutina({
  alumnos,
  rutinasBase,
}: {
  alumnos: OpcionAlumno[];
  rutinasBase: OpcionRutina[];
}) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Estado & { id?: string }, FormData>(
    crearRutina,
    {},
  );

  useEffect(() => {
    if (estado.id) router.push(`/admin/rutinas/${estado.id}`);
  }, [estado.id, router]);

  return (
    <form action={accion} className={styles.tarjeta}>
      <div className={styles.campo}>
        <label htmlFor="nueva-nombre">Nombre</label>
        <input id="nueva-nombre" name="nombre" required maxLength={80} placeholder="Octubre 2026" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nueva-alumno">Para quién</label>
        <select id="nueva-alumno" name="alumno" required defaultValue="">
          <option value="" disabled>
            Elige…
          </option>
          {alumnos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.texto}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nueva-desde">Empezar desde (opcional)</label>
        <select id="nueva-desde" name="desde" defaultValue="">
          <option value="">Rutina en blanco</option>
          {rutinasBase.map((r) => (
            <option key={r.id} value={r.id}>
              {r.texto}
            </option>
          ))}
        </select>
        <span className={styles.ayuda}>
          Copia las sesiones y ejercicios de una plantilla online o de otra rutina; luego la editas sin
          tocar la original.
        </span>
      </div>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear y editar"}
      </button>
    </form>
  );
}
