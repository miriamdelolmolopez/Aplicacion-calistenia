"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import {
  apuntarAlumno,
  cambiarAjustes,
  cambiarPlazas,
  cambiarTipo,
  cancelarClase,
  generarClases,
  quitarApuntado,
  quitarDeLista,
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

export function FormularioAjustes({
  horas,
  dias,
  ver,
}: {
  horas: number;
  dias: number;
  ver: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarAjustes, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Ajustes de reservas</h2>
      <div className={styles.campo}>
        <label htmlFor="aj-horas">Horas antes de la clase para cancelar sin perderla</label>
        <input
          id="aj-horas"
          name="horas"
          type="number"
          min={0}
          max={72}
          defaultValue={horas}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="aj-dias">Días de antelación máxima para reservar</label>
        <input id="aj-dias" name="dias" type="number" min={1} max={60} defaultValue={dias} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="ver" defaultChecked={ver} />
        Los alumnos ven quién está apuntado (nombre e inicial del apellido)
      </label>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar ajustes
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function FormularioTipo({
  tipo,
}: {
  tipo: {
    id: string;
    nombre: string;
    plazas_max: number;
    minimo_alumnos: number;
    plazas_prueba: number;
  };
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
      <div className={styles.campo}>
        <label htmlFor={`pp-${tipo.id}`}>Plazas para invitados (prueba)</label>
        <input
          id={`pp-${tipo.id}`}
          name="plazas_prueba"
          type="number"
          min={0}
          max={100}
          defaultValue={tipo.plazas_prueba}
        />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

type Apuntado = { reservaId: string; userId: string; nombre: string; prueba: boolean };
type Espera = { esperaId: string; nombre: string };

function FilaEspera({ espera, posicion }: { espera: Espera; posicion: number }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(quitarDeLista, {});
  return (
    <form action={accion} className={styles.apuntadoFila}>
      <input type="hidden" name="esperaId" value={espera.esperaId} />
      <span>
        {posicion}. {espera.nombre}
      </span>
      <span className={styles.apuntadoBotones}>
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          disabled={pendiente}
        >
          Quitar de la lista
        </button>
      </span>
      <Mensajes estado={estado} />
    </form>
  );
}

function FilaApuntado({ apuntado }: { apuntado: Apuntado }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(quitarApuntado, {});
  return (
    <form action={accion} className={styles.apuntadoFila}>
      <input type="hidden" name="reservaId" value={apuntado.reservaId} />
      <span>
        {apuntado.nombre}
        {apuntado.prueba && <span className={styles.etiquetaSuave}> Prueba</span>}
      </span>
      <span className={styles.apuntadoBotones}>
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          name="devolver"
          value="si"
          disabled={pendiente}
        >
          Quitar y devolver clase
        </button>
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          name="devolver"
          value="no"
          disabled={pendiente}
        >
          Quitar sin devolver
        </button>
      </span>
      <Mensajes estado={estado} />
    </form>
  );
}

function FormularioApuntar({
  sesionId,
  alumnos,
}: {
  sesionId: string;
  alumnos: { id: string; texto: string }[];
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(apuntarAlumno, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="sesionId" value={sesionId} />
      <div className={styles.campo}>
        <label htmlFor={`ap-${sesionId}`}>Apuntar a un alumno</label>
        <select id={`ap-${sesionId}`} name="persona" defaultValue="">
          <option value="" disabled>
            Elige una persona…
          </option>
          {alumnos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.texto}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Apuntar (descuenta una clase de su bono)
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function FilaClase({
  clase,
}: {
  clase: {
    id: string;
    plazas: number;
    plazasPrueba: number;
    cancelada: boolean;
    motivo: string | null;
    apuntados: Apuntado[];
    espera: Espera[];
    alumnos: { id: string; texto: string }[];
  };
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

  const posibles = clase.alumnos.filter(
    (a) => !clase.apuntados.some((p) => p.userId === a.id),
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
          <div className={styles.formularioInterno}>
            <strong>Apuntados ({clase.apuntados.length})</strong>
            {clase.apuntados.length === 0 && <p className={styles.ayuda}>Nadie todavía.</p>}
            {clase.apuntados.map((a) => (
              <FilaApuntado key={a.reservaId} apuntado={a} />
            ))}
          </div>

          {clase.espera.length > 0 && (
            <div className={styles.formularioInterno}>
              <strong>Lista de espera ({clase.espera.length})</strong>
              {clase.espera.map((e, i) => (
                <FilaEspera key={e.esperaId} espera={e} posicion={i + 1} />
              ))}
            </div>
          )}

          <FormularioApuntar sesionId={clase.id} alumnos={posibles} />

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
            <div className={styles.campo}>
              <label htmlFor={`prueba-${clase.id}`}>Plazas para invitados (prueba)</label>
              <input
                id={`prueba-${clase.id}`}
                name="plazas_prueba"
                type="number"
                min={0}
                max={100}
                defaultValue={clase.plazasPrueba}
              />
            </div>
            <button className={styles.boton} type="submit" disabled={pendientePlazas}>
              Guardar plazas
            </button>
            <Mensajes estado={estadoPlazas} />
          </form>

          <form action={accionCancelar} className={styles.formularioInterno}>
            <input type="hidden" name="sesionId" value={clase.id} />
            <strong>Cancelar esta clase</strong>
            <p className={styles.ayuda}>
              Se devolverá su clase a las {clase.apuntados.length} personas apuntadas. Aún no
              se envían avisos: lo verán en la app (los avisos llegan en la Fase 6).
            </p>
            <div className={styles.campo}>
              <label htmlFor={`dias-${clase.id}`}>¿Cuántos días amplías su bono?</label>
              <input
                id={`dias-${clase.id}`}
                name="dias"
                type="number"
                min={0}
                max={60}
                defaultValue={0}
              />
              <span className={styles.ayuda}>
                Pon 0 si no quieres ampliar. Por lluvia, tu política es 7 días.
              </span>
            </div>
            <div className={styles.campo}>
              <label htmlFor={`motivo-${clase.id}`}>Motivo (opcional)</label>
              <input id={`motivo-${clase.id}`} name="motivo" maxLength={200} />
            </div>
            <button
              className={`${styles.boton} ${styles.botonSecundario}`}
              type="submit"
              disabled={pendienteCancelar}
            >
              Cancelar clase y devolver las clases
            </button>
          </form>
        </>
      )}
      <Mensajes estado={estadoCancelar} />
    </details>
  );
}
