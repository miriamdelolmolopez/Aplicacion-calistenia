"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { euros } from "@/lib/formato";
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
  descuentos,
  formas,
  hoy,
  ahora,
  alTerminar,
}: {
  hoy: string;
  ahora: string;
  alTerminar?: () => void;
  formas: { clave: string; nombre: string }[];
  alumnos: { id: string; texto: string }[];
  tipos: { id: string; texto: string; precio: number }[];
  descuentos: { id: string; texto: string; tipo: string; valor: number }[];
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(registrarBono, {});
  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 900);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);
  const [tipoElegido, setTipoElegido] = useState("");
  const [descuentoElegido, setDescuentoElegido] = useState("");

  // Total que pagará (el mismo cálculo que hace la base de datos).
  const precio = tipos.find((t) => t.id === tipoElegido)?.precio ?? null;
  const d = descuentos.find((x) => x.id === descuentoElegido);
  const rebaja =
    precio !== null && d
      ? d.tipo === "porcentaje"
        ? Math.round((precio * d.valor) / 100)
        : Math.min(d.valor, precio)
      : 0;
  return (
    <form action={accion} className={styles.tarjeta}>
      {alumnos.length === 0 ? (
        <p className={styles.ayuda}>
          Todavía no hay alumnos. Da de alta uno en Administración o cambia a alumno a un
          invitado.
        </p>
      ) : (
        <>
          <div className={styles.campo}>
            <label htmlFor="persona">Alumna</label>
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
            <label htmlFor="tipo">Tarifa</label>
            <select id="tipo" name="tipo" required value={tipoElegido} onChange={(e) => setTipoElegido(e.target.value)}>
              <option value="" disabled>
                Elige una tarifa…
              </option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.texto}
                </option>
              ))}
            </select>
          </div>
          {descuentos.length === 0 && (
            <p className={styles.ayuda}>
              No hay descuentos disponibles. Puedes crearlos en <Link href="/admin/descuentos">Descuentos</Link> y luego elegirlos aquí.
            </p>
          )}
          {descuentos.length > 0 && (
            <div className={styles.campo}>
              <label htmlFor="descuento">Descuento (opcional)</label>
              <select
                id="descuento"
                name="descuento"
                value={descuentoElegido}
                onChange={(e) => setDescuentoElegido(e.target.value)}
              >
                <option value="">Sin descuento</option>
                {descuentos.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.texto}
                  </option>
                ))}
              </select>
            </div>
          )}
          {precio !== null && rebaja > 0 && (
            <p className={styles.aviso}>
              Precio {euros(precio)} − descuento {euros(rebaja)} = <strong>Total {euros(precio - rebaja)}</strong>
            </p>
          )}
          <div className={styles.campo}>
            <label htmlFor="metodo">¿Cómo paga?</label>
            <select id="metodo" name="metodo" defaultValue={formas[0]?.clave}>
              {formas.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="fecha">Día del pago</label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="hora">Hora del pago</label>
            <input id="hora" name="hora" type="time" defaultValue={ahora} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="nota">Nota (opcional)</label>
            <input id="nota" name="nota" maxLength={200} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Registrar pago"}
          </button>
        </>
      )}
      <Mensajes estado={estado} />
    </form>
  );
}

export function BotonPagado({ pagoId }: { pagoId: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(marcarPagado, {});
  const [confirmando, setConfirmando] = useState(false);
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="pagoId" value={pagoId} />
      {confirmando ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span>¿Marcar este pago como cobrado?</span>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar: ya está cobrado"}
          </button>
          <button className={`${styles.boton} ${styles.botonSecundario}`} type="button" onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className={styles.boton} type="button" onClick={() => setConfirmando(true)}>
          Marcar como pagado
        </button>
      )}
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
