"use client";

import { useActionState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import { useEnvio } from "../../useEnvio";
import { cambiarInicioBono, registrarClaseHecha } from "../acciones";

export type TipoClaseOpcion = { id: string; nombre: string };

// Para alumnas que ya traían un bono empezado: se marcan las clases que ya hicieron.
export function ClasesHechas({ userId, tipos }: { userId: string; tipos: TipoClaseOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(registrarClaseHecha, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
      <input type="hidden" name="userId" value={userId} />
      <p className={styles.ayuda}>
        ¿Ya hizo clases de su bono antes de entrar en la app? Elige el día y se le descuentan como hechas. No se le avisa por correo.
      </p>
      <div className={styles.campo}>
        <label htmlFor="ch-tipo">Tipo de clase</label>
        <select id="ch-tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Elige…
          </option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="ch-fecha">Día</label>
        <input id="ch-fecha" name="fecha" type="date" max={hoy} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="ch-hora">Hora</label>
        <input id="ch-hora" name="hora" type="time" required defaultValue="19:00" />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Registrando…" : "Registrar clase hecha"}
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
  );
}

// Cambiar el día en que empezó un bono.
export function InicioBono({ userId, bonoId }: { userId: string; bonoId: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarInicioBono, {});
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="bonoId" value={bonoId} />
      <div className={styles.campo}>
        <label htmlFor={`ib-${bonoId}`}>Empezó el</label>
        <input id={`ib-${bonoId}`} name="inicio" type="date" max={hoy} required />
      </div>
      <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Cambiar fecha de inicio"}
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
  );
}
