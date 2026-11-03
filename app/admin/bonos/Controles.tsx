"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { euros } from "@/lib/formato";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
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
          Todavía no hay alumnos/as. Da de alta uno en Administración o cambia a alumno/a a un
          invitado.
        </p>
      ) : (
        <>
          <div className={styles.campo}>
            <label htmlFor="persona">Alumno/a <AyudaI texto="La persona que paga." /></label>
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
            <label htmlFor="tipo">Tarifa <AyudaI texto="Qué tarifa contrata. Al registrar el pago, la persona recibe ese servicio." /></label>
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
              <label htmlFor="descuento">Descuento (opcional) <AyudaI texto="Rebaja el importe con uno de los descuentos que tienes creados." /></label>
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
            <label htmlFor="metodo">¿Cómo paga? <AyudaI texto="La forma de pago. Las opciones salen de «Formas de pago»." /></label>
            <select id="metodo" name="metodo" defaultValue={formas[0]?.clave}>
              {formas.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="fecha">Día del pago <AyudaI texto="El día en que pagó. No puede ser futuro." /></label>
            <input id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="hora">Hora del pago <AyudaI texto="La hora a la que pagó." /></label>
            <input id="hora" name="hora" type="time" defaultValue={ahora} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="nota">Nota (opcional) <AyudaI texto="Un apunte sobre este pago, si quieres dejarlo anotado." /></label>
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

export function EditorBono({ bonoId, anulado, sinAnular = false }: { bonoId: string; anulado: boolean; sinAnular?: boolean }) {
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
      <summary>{sinAnular ? "Ajustar clases o días (avanzado)" : "Ajustar o quitar esta tarifa"}</summary>
      <form action={accionAjuste} className={styles.formularioInterno}>
        <input type="hidden" name="bonoId" value={bonoId} />
        <p className={styles.ayuda}>
          Un número positivo añade clases sueltas aparte (sin caducidad), sin tocar esta tarifa; uno negativo quita
          clases de esta tarifa. Déjalo en 0 si no cambia.
        </p>
        <div className={styles.campo}>
          <label htmlFor={`cl-${bonoId}`}>Clases (+ o −) <AyudaI texto="Positivo: se añaden como clases sueltas aparte de la tarifa (por ejemplo, un regalo de cumpleaños). Negativo: se quitan de esta tarifa. Con 0 no cambia." /></label>
          <input id={`cl-${bonoId}`} name="clases" type="number" step={1} defaultValue={0} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`di-${bonoId}`}>Días de caducidad (+ o −) <AyudaI texto="Cuántos días alargar (positivo) o acortar (negativo) la caducidad del bono. Con 0 no cambia." /></label>
          <input id={`di-${bonoId}`} name="dias" type="number" step={1} defaultValue={0} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`no-${bonoId}`}>Motivo (opcional) <AyudaI texto="Por qué haces el ajuste. Se guarda en el historial del bono." /></label>
          <input id={`no-${bonoId}`} name="nota" maxLength={200} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendienteAjuste}>
          Guardar ajuste
        </button>
        <Mensajes estado={estadoAjuste} />
      </form>
      {!sinAnular && (
      <form action={accionAnular} className={styles.formularioInterno}>
        <input type="hidden" name="bonoId" value={bonoId} />
        <div className={styles.campo}>
          <label htmlFor={`an-${bonoId}`}>Motivo (opcional) <AyudaI texto="Por qué quitas la tarifa. Se guarda en el historial del bono." /></label>
          <input id={`an-${bonoId}`} name="nota" maxLength={200} />
        </div>
        <button
          className={`${styles.boton} ${styles.botonSecundario}`}
          type="submit"
          disabled={pendienteAnular}
        >
          Quitar esta tarifa (anular el bono)
        </button>
        <Mensajes estado={estadoAnular} />
      </form>
      )}
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
        <label htmlFor={`pr-${tipo.id}`}>Precio (€) <AyudaI texto="El precio de la tarifa, con el IVA incluido." /></label>
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
