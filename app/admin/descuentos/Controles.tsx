"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { borrarDescuento, cambiarActivo, crearDescuento } from "./acciones";

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

export function NuevoDescuento() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearDescuento, {});
  const [tipo, setTipo] = useState("porcentaje");
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Nuevo descuento</h2>
      <div className={styles.campo}>
        <label htmlFor="nd-nombre">Nombre (por ejemplo «Alumnas de siempre»)</label>
        <input id="nd-nombre" name="nombre" maxLength={60} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nd-tipo">Tipo</label>
        <select id="nd-tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="porcentaje">Porcentaje (%)</option>
          <option value="euros">Importe fijo (€)</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nd-valor">{tipo === "porcentaje" ? "Porcentaje (1 a 100)" : "Importe en euros"}</label>
        <input id="nd-valor" name="valor" inputMode="decimal" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nd-caduca">Caduca el (opcional)</label>
        <input id="nd-caduca" name="caduca_en" type="date" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nd-usos">Máximo de veces que se puede usar (opcional)</label>
        <input id="nd-usos" name="usos_max" type="number" min={1} max={10000} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Crear descuento
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

function Accion({
  id,
  accion,
  texto,
  extra,
  confirmar,
}: {
  id: string;
  accion: (previo: Estado, formData: FormData) => Promise<Estado>;
  texto: string;
  extra?: Record<string, string>;
  confirmar?: string;
}) {
  const [estado, ejecutar, pendiente] = useActionState<Estado, FormData>(accion, {});
  return (
    <form
      action={ejecutar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendiente}>
        {texto}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function AccionesDescuento({ id, activo, nombre }: { id: string; activo: boolean; nombre: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Accion id={id} accion={cambiarActivo} texto={activo ? "Desactivar" : "Activar"} extra={{ activar: activo ? "no" : "si" }} />
      <Accion
        id={id}
        accion={borrarDescuento}
        texto="Borrar"
        confirmar={`¿Borrar el descuento «${nombre}»? Solo se puede si nunca se ha usado.`}
      />
    </div>
  );
}
