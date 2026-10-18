"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import {
  cambiarPlazas,
  cambiarTipo,
  cancelarClase,
  generarClases,
  reactivarClase,
} from "./acciones";

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

export function GenerarClases() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(generarClases, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Crear clases del horario</h2>
      <p className={styles.ayuda}>
        Crea las clases de los próximos días según el horario semanal. Las que ya existan no
        se duplican.
      </p>
      <div className={styles.campo}>
        <label htmlFor="semanas">¿Cuántas semanas?</label>
        <select id="semanas" name="semanas" defaultValue="4">
          {[1, 2, 3, 4, 6, 8, 12].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "semana" : "semanas"}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear clases"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function FormularioTipo({
  tipo,
}: {
  tipo: { id: string; nombre: string; plazas_max: number; minimo_alumnos: number };
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarTipo, {});
  return (
    <form action={accion} className={styles.filaTipo}>
      <input type="hidden" name="tipoId" value={tipo.id} />
      <strong className={styles.nombreTipo}>{tipo.nombre}</strong>
      <div className={styles.campo}>
        <label htmlFor={`pl-${tipo.id}`}>Plazas</label>
        <input
          id={`pl-${tipo.id}`}
          name="plazas_max"
          type="number"
          min={1}
          max={100}
          defaultValue={tipo.plazas_max}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`mi-${tipo.id}`}>Mínimo</label>
        <input
          id={`mi-${tipo.id}`}
          name="minimo_alumnos"
          type="number"
          min={0}
          max={100}
          defaultValue={tipo.minimo_alumnos}
        />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function FilaClase({
  clase,
}: {
  clase: { id: string; plazas: number; cancelada: boolean; motivo: string | null };
}) {
  const [estadoPlazas, accionPlazas, pendientePlazas] = useActionState<Estado, FormData>(
    cambiarPlazas,
    {},
  );
  const [estadoCancelar, accionCancelar, pendienteCancelar] = useActionState<Estado, FormData>(
    cancelarClase,
    {},
  );
  const [estadoReactivar, accionReactivar, pendienteReactivar] = useActionState<Estado, FormData>(
    reactivarClase,
    {},
  );

  return (
    <details className={styles.detalles}>
      <summary>{clase.cancelada ? "Cancelada · opciones" : "Opciones"}</summary>

      {clase.cancelada ? (
        <form action={accionReactivar} className={styles.formularioInterno}>
          {clase.motivo && <p className={styles.ayuda}>Motivo: {clase.motivo}</p>}
          <input type="hidden" name="sesionId" value={clase.id} />
          <button className={styles.boton} type="submit" disabled={pendienteReactivar}>
            Reactivar clase
          </button>
          <Mensajes estado={estadoReactivar} />
        </form>
      ) : (
        <>
          <form action={accionPlazas} className={styles.formularioInterno}>
            <input type="hidden" name="sesionId" value={clase.id} />
            <div className={styles.campo}>
              <label htmlFor={`plazas-${clase.id}`}>Plazas de esta clase</label>
              <input
                id={`plazas-${clase.id}`}
                name="plazas"
                type="number"
                min={1}
                max={100}
                defaultValue={clase.plazas}
              />
            </div>
            <button className={styles.boton} type="submit" disabled={pendientePlazas}>
              Guardar plazas
            </button>
            <Mensajes estado={estadoPlazas} />
          </form>
          <form action={accionCancelar} className={styles.formularioInterno}>
            <input type="hidden" name="sesionId" value={clase.id} />
            <div className={styles.campo}>
              <label htmlFor={`motivo-${clase.id}`}>Motivo (opcional)</label>
              <input id={`motivo-${clase.id}`} name="motivo" maxLength={200} />
            </div>
            <button
              className={`${styles.boton} ${styles.botonSecundario}`}
              type="submit"
              disabled={pendienteCancelar}
            >
              Cancelar esta clase
            </button>
            <Mensajes estado={estadoCancelar} />
          </form>
        </>
      )}
    </details>
  );
}
