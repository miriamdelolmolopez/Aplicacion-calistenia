"use client";

import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { colorDeTipo, PALETA_CLASES } from "@/lib/colores";
import {
  apuntarAlumno,
  cambiarAjustes,
  cambiarPlazas,
  cambiarTipo,
  cancelarClase,
  crearTipo,
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
  horasIndividual,
  dias,
  ver,
}: {
  horas: number;
  horasIndividual: number;
  dias: number;
  ver: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarAjustes, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Ajustes de reservas</h2>
      <div className={styles.campo}>
        <label htmlFor="aj-horas">Horas antes de una clase grupal para cancelar sin perderla</label>
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
        <label htmlFor="aj-horas-ind">Horas antes de una clase individual para cancelar sin perderla</label>
        <input id="aj-horas-ind" name="horas_individual" type="number" min={0} max={72} defaultValue={horasIndividual} />
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
    duracion_min: number;
    activo: boolean;
    servicio: string;
    color: string | null;
    color_texto: string | null;
    orden: number;
    lista_espera: boolean;
    reserva_dias_max: number | null;
    cancelacion_horas: number | null;
    creditos: number;
    descripcion: string | null;
    descripcion_en: string | null;
  };
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarTipo, {});
  const colorActual = colorDeTipo(tipo.color, tipo.nombre);
  return (
    <form action={accion} className={`${styles.filaTipo} ${styles.tipoClase}`}>
      <input type="hidden" name="tipoId" value={tipo.id} />
      <p className={styles.ayuda}>
        {tipo.servicio === "individual" ? "Entrenamiento individual: lo ven y reservan solo las alumnas individuales." : "Clase grupal."}
      </p>
      <div className={styles.campo}>
        <label htmlFor={`no-${tipo.id}`}>Nombre</label>
        <input id={`no-${tipo.id}`} name="nombre" maxLength={60} defaultValue={tipo.nombre} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`du-${tipo.id}`}>Duración (minutos)</label>
        <input
          id={`du-${tipo.id}`}
          name="duracion_min"
          type="number"
          min={10}
          max={240}
          defaultValue={tipo.duracion_min}
        />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={tipo.activo} />
        <span>Activo (si lo desactivas no se crean clases nuevas de este tipo)</span>
      </label>
      <div className={styles.campo}>
        <label htmlFor={`or-${tipo.id}`}>Orden de aparición (1 sale primero)</label>
        <input id={`or-${tipo.id}`} name="orden" type="number" min={0} max={9999} defaultValue={tipo.orden} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="lista_espera" defaultChecked={tipo.lista_espera} />
        <span>Tiene lista de espera (si está llena, las alumnas pueden apuntarse a la lista)</span>
      </label>
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
      <div className={styles.campo}>
        <label htmlFor={`cr-${tipo.id}`}>Créditos que gasta cada reserva (1 = una clase del bono)</label>
        <input id={`cr-${tipo.id}`} name="creditos" type="number" min={1} max={20} defaultValue={tipo.creditos} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`rd-${tipo.id}`}>Cuántos días antes se puede reservar</label>
        <input id={`rd-${tipo.id}`} name="reserva_dias_max" type="number" min={1} max={365} defaultValue={tipo.reserva_dias_max ?? ""} placeholder="Vacío = el ajuste general" />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ch-${tipo.id}`}>Horas antes para cancelar sin perder la clase</label>
        <input id={`ch-${tipo.id}`} name="cancelacion_horas" type="number" min={0} max={168} defaultValue={tipo.cancelacion_horas ?? ""} placeholder="Vacío = el ajuste general" />
        <span className={styles.ayuda}>Lo que dejes vacío sigue el ajuste general de «Ajustes de reservas».</span>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`de-${tipo.id}`}>Descripción («Saber más» en Reservas)</label>
        <textarea id={`de-${tipo.id}`} name="descripcion" rows={5} maxLength={1500} defaultValue={tipo.descripcion ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`den-${tipo.id}`}>Descripción en inglés (opcional)</label>
        <textarea id={`den-${tipo.id}`} name="descripcion_en" rows={5} maxLength={1500} defaultValue={tipo.descripcion_en ?? ""} />
      </div>
      <fieldset className={styles.grupo}>
        <legend>Color en el calendario de Mis reservas</legend>
        <div className={styles.muestras}>
          {PALETA_CLASES.map((p) => (
            <label key={p.color} className={styles.muestra} title={p.nombre}>
              <input type="radio" name="color" value={p.color} defaultChecked={p.color.toLowerCase() === colorActual.toLowerCase()} />
              <span style={{ background: p.color }} />
              <span className={styles.oculto}>{p.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.grupo}>
        <legend>Color de la letra sobre ese color</legend>
        <div className={styles.muestras}>
          {[
            { valor: "#FFFFFF", nombre: "Blanca" },
            { valor: "#2B2B2A", nombre: "Oscura" },
          ].map((c) => (
            <label key={c.valor} className={styles.casilla}>
              <input type="radio" name="color_texto" value={c.valor} defaultChecked={(tipo.color_texto ?? "#FFFFFF").toLowerCase() === c.valor.toLowerCase()} />
              <span style={{ background: colorActual, color: c.valor, padding: "2px 10px", borderRadius: 8 }}>{c.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function NuevoTipo({ alTerminar }: { alTerminar?: () => void } = {}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearTipo, {});
  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 700);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);
  return (
    <form action={accion} className={`${styles.filaTipo} ${styles.tipoClase}`}>
      <div className={styles.campo}>
        <label htmlFor="nt-nombre">Nombre</label>
        <input id="nt-nombre" name="nombre" maxLength={60} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nt-servicio">Para quién es</label>
        <select id="nt-servicio" name="servicio" defaultValue="grupal">
          <option value="grupal">Clase grupal</option>
          <option value="individual">Entrenamiento individual (1 persona)</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nt-plazas">Plazas</label>
        <input id="nt-plazas" name="plazas_max" type="number" min={1} max={100} defaultValue={8} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nt-min">Mínimo</label>
        <input id="nt-min" name="minimo_alumnos" type="number" min={0} max={100} defaultValue={0} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nt-prueba">Plazas para invitados (prueba)</label>
        <input id="nt-prueba" name="plazas_prueba" type="number" min={0} max={100} defaultValue={2} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="lista_espera" defaultChecked />
        <span>Tiene lista de espera</span>
      </label>
      <div className={styles.campo}>
        <label htmlFor="nt-dur">Duración (minutos)</label>
        <input id="nt-dur" name="duracion_min" type="number" min={10} max={240} defaultValue={60} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Crear tipo
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
