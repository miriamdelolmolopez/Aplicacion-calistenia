"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { useEnvio } from "../useEnvio";
import { editarClase, eliminarClase } from "./acciones";
import estilos from "./horario.module.css";
import { IconoArena, IconoLapiz, IconoPapelera, IconoProhibido, IconoUsuario } from "./iconos";

export type DatosClase = {
  id: string;
  tipoId: string;
  fecha: string;
  hora: string;
  nombre: string;
  color: string;
  cancelada: boolean;
  apuntadas: number;
  plazas: number;
  plazasPrueba: number;
  horasCancelar: number;
  diasPreinscripcion: number;
  horasPropias: number | null; // regla propia del tipo (vacío = la general)
  diasPropios: number | null;
  coachId: string | null;
  coachNombre: string | null;
};

type CoachOpcion = { id: string; nombre: string };

function Editor({ c, coaches, cerrar }: { c: DatosClase; coaches: CoachOpcion[]; cerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(editarClase, {});
  const { ref, alEnviar } = useEnvio(accion, estado, false);

  useEffect(() => {
    if (!estado.mensaje) return;
    const t = setTimeout(cerrar, 700);
    return () => clearTimeout(t);
  }, [estado, cerrar]);

  return (
    <div className={estilos.capa}>
      <div className={estilos.modal} role="dialog" aria-modal="true" aria-label={`Editar ${c.nombre}`} onClick={(e) => e.stopPropagation()}>
        <h2>Editar {c.nombre}</h2>
        <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
          <input type="hidden" name="sesionId" value={c.id} />
          <input type="hidden" name="tipoId" value={c.tipoId} />
          <div className={styles.campo}>
            <label htmlFor={`e-f-${c.id}`}>Día <AyudaI texto="El día en que se da la clase." /></label>
            <input id={`e-f-${c.id}`} name="fecha" type="date" required defaultValue={c.fecha} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`e-h-${c.id}`}>Hora <AyudaI texto="La hora a la que empieza." /></label>
            <input id={`e-h-${c.id}`} name="hora" type="time" required defaultValue={c.hora} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`e-coach-${c.id}`}>Coach <AyudaI texto="Quién da la clase. Salen las personas marcadas como coach en su ficha de usuario." /></label>
            <select id={`e-coach-${c.id}`} name="coach" defaultValue={c.coachId ?? ""}>
              <option value="">Sin elegir</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`e-p-${c.id}`}>Plazas en total <AyudaI texto="Cuántas personas caben en esta clase, contando las de prueba." /></label>
            <input id={`e-p-${c.id}`} name="plazas" type="number" min={1} max={100} required defaultValue={c.plazas} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`e-i-${c.id}`}>De ellas, plazas para invitados/as (clase de prueba) <AyudaI texto="Cuántas de las plazas totales se reservan para personas que vienen a su clase de prueba gratuita." /></label>
            <input id={`e-i-${c.id}`} name="plazas_prueba" type="number" min={0} max={100} defaultValue={c.plazasPrueba} />
          </div>
          <p className={styles.ayuda}>
            Estas dos reglas son de todas las clases «{c.nombre}», no solo de esta. Vacío = la regla general.
          </p>
          <div className={styles.campo}>
            <label htmlFor={`e-c-${c.id}`}>Horas antes para poder cancelar (general: {c.horasPropias === null ? c.horasCancelar : "—"}) <AyudaI texto="Con cuántas horas de antelación se puede cancelar sin perder la clase. Si lo dejas como está, vale el ajuste general." /></label>
            <input id={`e-c-${c.id}`} name="cancelacion_horas" type="number" min={0} max={168} defaultValue={c.horasPropias ?? ""} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`e-d-${c.id}`}>Días de preinscripción (general: {c.diasPropios === null ? c.diasPreinscripcion : "—"}) <AyudaI texto="Con cuántos días de antelación se puede reservar esta clase. Si lo dejas como está, vale el ajuste general." /></label>
            <input id={`e-d-${c.id}`} name="reserva_dias_max" type="number" min={1} max={365} defaultValue={c.diasPropios ?? ""} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" className={estilos.cerrar} onClick={cerrar}>
            Cancelar
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
      </div>
    </div>
  );
}

// Tarjeta resumen de una clase, al estilo de un horario de box: iconos con las cifras importantes.
export default function TarjetaClase({ c, coaches }: { c: DatosClase; coaches: CoachOpcion[] }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  return (
    <div className={`${estilos.tarjetaClase} ${c.cancelada ? estilos.cancelada : ""}`} style={{ borderColor: c.color }}>
      <div className={estilos.acciones}>
        <button type="button" className={estilos.accionEditar} onClick={() => setEditando(true)} aria-label={`Editar ${c.nombre} ${c.hora}`}>
          <IconoLapiz titulo="Editar" />
        </button>
        <button type="button" className={estilos.accionBorrar} onClick={() => setConfirmando((v) => !v)} aria-label={`Eliminar ${c.nombre} ${c.hora}`}>
          <IconoPapelera titulo="Eliminar" />
        </button>
      </div>
      {confirmando && (
        <div className={estilos.confirmar}>
          <span>¿Eliminar esta clase?</span>
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              empezar(async () => {
                const r = await eliminarClase(c.id);
                setAviso(r);
                if (!r.error) setConfirmando(false);
              })
            }
          >
            Sí
          </button>
          <button type="button" onClick={() => setConfirmando(false)}>
            No
          </button>
        </div>
      )}
      {aviso.error && <p className={estilos.errorClase}>{aviso.error}</p>}
      <strong className={estilos.nombreClase} style={{ color: c.color }}>
        {c.nombre}
      </strong>
      {c.coachNombre && <span className={estilos.coachClase}>con {c.coachNombre}</span>}
      {c.cancelada && <span className={estilos.etiquetaCancelada}>Cancelada</span>}
      <div className={estilos.cifras}>
        <span className={estilos.apuntadas} title="Personas apuntadas">
          <IconoUsuario color="#1f9d63" titulo="Personas apuntadas" />
          {c.apuntadas}
        </span>
      </div>
      <div className={estilos.cifras}>
        <span title="Horas antes para poder cancelar">
          <IconoProhibido color="#d6453d" titulo="Horas para cancelar" />
          {c.horasCancelar}h
        </span>
        <span title="Días de preinscripción">
          <IconoArena color="#e8890c" titulo="Días de preinscripción" />
          {c.diasPreinscripcion}d
        </span>
      </div>
      <div className={estilos.cifras}>
        <span title="Plazas para alumnos/as">
          <IconoUsuario color="#3a3a3c" titulo="Plazas para alumnos/as" />
          {c.plazas}
        </span>
        <span title="Plazas para invitados/as">
          <IconoUsuario color="#b5b8bd" titulo="Plazas para invitados/as" />
          {c.plazasPrueba}
        </span>
      </div>
      {editando && <Editor c={c} coaches={coaches} cerrar={() => setEditando(false)} />}
    </div>
  );
}
