"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import {
  ajustarBono,
  anularBono,
  cambiarPrecio,
  marcarPagado,
  registrarBono,
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

export function FormularioRegistrar({
  alumnos,
  tipos,
}: {
  alumnos: { id: string; texto: string }[];
  tipos: { id: string; texto: string }[];
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(registrarBono, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Registrar un bono</h2>
      {alumnos.length === 0 ? (
        <p className={styles.ayuda}>
          Todavía no hay alumnos. Da de alta uno en Administración o cambia a alumno a un
          invitado.
        </p>
      ) : (
        <>
          <div className={styles.campo}>
            <label htmlFor="persona">Alumno</label>
            <select id="persona" name="persona" required defaultValue="">
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
          <div className={styles.campo}>
            <label htmlFor="tipo">Bono</label>
            <select id="tipo" name="tipo" required defaultValue="">
              <option value="" disabled>
                Elige un bono…
              </option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="metodo">¿Cómo paga?</label>
            <select id="metodo" name="metodo" defaultValue="efectivo">
              <option value="efectivo">Efectivo</option>
              <option value="bizum">Bizum</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <label className={styles.casilla}>
            <input type="checkbox" name="pagado" />
            Ya me ha pagado
          </label>
          <div className={styles.campo}>
            <label htmlFor="nota">Nota (opcional)</label>
            <input id="nota" name="nota" maxLength={200} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Registrar bono"}
          </button>
        </>
      )}
      <Mensajes estado={estado} />
    </form>
  );
}

export function BotonPagado({ pagoId }: { pagoId: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(marcarPagado, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="pagoId" value={pagoId} />
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Marcar como pagado"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function EditorBono({ bonoId, anulado }: { bonoId: string; anulado: boolean }) {
  const [estadoAjuste, accionAjuste, pendienteAjuste] = useActionState<Estado, FormData>(
    ajustarBono,
    {},
  );
  const [estadoAnular, accionAnular, pendienteAnular] = useActionState<Estado, FormData>(
    anularBono,
    {},
  );
  if (anulado) return null;

  return (
    <details className={styles.detalles}>
      <summary>Ajustar o anular</summary>
      <form action={accionAjuste} className={styles.formularioInterno}>
        <input type="hidden" name="bonoId" value={bonoId} />
        <p className={styles.ayuda}>
          Escribe un número positivo para sumar y negativo para quitar. Déjalo en 0 si no
          cambia.
        </p>
        <div className={styles.campo}>
          <label htmlFor={`cl-${bonoId}`}>Clases (+ o −)</label>
          <input id={`cl-${bonoId}`} name="clases" type="number" step={1} defaultValue={0} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`di-${bonoId}`}>Días de caducidad (+ o −)</label>
          <input id={`di-${bonoId}`} name="dias" type="number" step={1} defaultValue={0} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`no-${bonoId}`}>Motivo (opcional)</label>
          <input id={`no-${bonoId}`} name="nota" maxLength={200} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendienteAjuste}>
          Guardar ajuste
        </button>
        <Mensajes estado={estadoAjuste} />
      </form>
      <form action={accionAnular} className={styles.formularioInterno}>
        <input type="hidden" name="bonoId" value={bonoId} />
        <div className={styles.campo}>
          <label htmlFor={`an-${bonoId}`}>Motivo de la anulación (opcional)</label>
          <input id={`an-${bonoId}`} name="nota" maxLength={200} />
        </div>
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          disabled={pendienteAnular}
        >
          Anular este bono
        </button>
        <Mensajes estado={estadoAnular} />
      </form>
    </details>
  );
}

export function FormularioPrecio({
  tipo,
}: {
  tipo: { id: string; nombre: string; precio: string };
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarPrecio, {});
  return (
    <form action={accion} className={styles.filaTipo}>
      <input type="hidden" name="tipoId" value={tipo.id} />
      <strong className={styles.nombreTipo}>{tipo.nombre}</strong>
      <div className={styles.campo}>
        <label htmlFor={`pr-${tipo.id}`}>Precio (€)</label>
        <input
          id={`pr-${tipo.id}`}
          name="precio"
          inputMode="decimal"
          defaultValue={tipo.precio}
        />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}
