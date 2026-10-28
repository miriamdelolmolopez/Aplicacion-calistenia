"use client";

import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import estiloCuadricula from "./cuadricula.module.css";
import {
  anadirClase,
  aplicarPlantilla,
  borrarPlantilla,
  crearPlantilla,
  duplicarPlantilla,
  marcarPrincipal,
  quitarClase,
  renombrarPlantilla,
} from "./acciones";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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

export function NuevaPlantilla({ alTerminar }: { alTerminar?: () => void } = {}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearPlantilla, {});
  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);
  return (
    <form action={accion} className={styles.tarjeta}>
      <div className={styles.campo}>
        <label htmlFor="np-nombre">Nombre (por ejemplo «Verano»)</label>
        <input id="np-nombre" name="nombre" maxLength={60} required />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Crear plantilla
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function Renombrar({ id, nombre }: { id: string; nombre: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(renombrarPlantilla, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="id" value={id} />
      <div className={styles.campo}>
        <label htmlFor={`rn-${id}`}>Nombre</label>
        <input id={`rn-${id}`} name="nombre" maxLength={60} defaultValue={nombre} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Guardar nombre
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

function Boton({
  id,
  accion,
  texto,
  confirmar,
  secundario = true,
}: {
  id: string;
  accion: (previo: Estado, formData: FormData) => Promise<Estado>;
  texto: string;
  confirmar?: string;
  secundario?: boolean;
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
      <button className={`${styles.boton} ${secundario ? styles.botonSecundario : ""}`} type="submit" disabled={pendiente}>
        {texto}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export const Duplicar = ({ id }: { id: string }) => <Boton id={id} accion={duplicarPlantilla} texto="Duplicar" />;
export const HacerPrincipal = ({ id }: { id: string }) => (
  <Boton id={id} accion={marcarPrincipal} texto="Hacer principal" />
);
export const Borrar = ({ id, nombre }: { id: string; nombre: string }) => (
  <Boton
    id={id}
    accion={borrarPlantilla}
    texto="Borrar plantilla"
    confirmar={`¿Borrar la plantilla «${nombre}»? Las clases ya creadas con ella no cambian.`}
  />
);

export function QuitarClase({ id, texto }: { id: string; texto: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(quitarClase, {});
  return (
    <form action={accion} className={styles.apuntadoFila}>
      <input type="hidden" name="id" value={id} />
      <span>{texto}</span>
      <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendiente} aria-label={`Quitar ${texto}`}>
        Quitar
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

// Botón pequeño para quitar una clase de la cuadrícula de la plantilla.
export function QuitarCompacto({ id, texto }: { id: string; texto: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(quitarClase, {});
  return (
    <form action={accion} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={estiloCuadricula.quitar} disabled={pendiente} aria-label={`Quitar ${texto}`} title="Quitar de la plantilla">
        ×
      </button>
      {estado.error && <span role="alert"> {estado.error}</span>}
    </form>
  );
}

export function AnadirClase({ plantillaId, tipos }: { plantillaId: string; tipos: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anadirClase, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="plantillaId" value={plantillaId} />
      <strong>Añadir una clase</strong>
      <div className={styles.campo}>
        <label htmlFor={`ac-dia-${plantillaId}`}>Día</label>
        <select id={`ac-dia-${plantillaId}`} name="dia" defaultValue="1">
          {DIAS.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ac-hora-${plantillaId}`}>Hora</label>
        <input id={`ac-hora-${plantillaId}`} name="hora" type="time" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ac-tipo-${plantillaId}`}>Tipo de clase</label>
        <select id={`ac-tipo-${plantillaId}`} name="tipo">
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ac-pl-${plantillaId}`}>Plazas (vacío = las del tipo de clase)</label>
        <input id={`ac-pl-${plantillaId}`} name="plazas" type="number" min={1} max={100} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        Añadir
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function Aplicar({ id, hoy }: { id: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(aplicarPlantilla, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="id" value={id} />
      <strong>Publicar las clases de esta plantilla</strong>
      <p className={styles.ayuda}>
        Elige desde qué día hasta qué día (los dos incluidos). Solo se crean las clases que falten; las que ya
        existen y sus reservas no se tocan. Las alumnas verán las clases en cuanto las publiques.
      </p>
      <div className={styles.campo}>
        <label htmlFor={`ap-d-${id}`}>Desde el día</label>
        <input id={`ap-d-${id}`} name="desde" type="date" defaultValue={hoy} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ap-h-${id}`}>Hasta el día</label>
        <input id={`ap-h-${id}`} name="hasta" type="date" defaultValue={hoy} required />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Publicando…" : "Publicar clases"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function BotonImprimir() {
  return (
    <button type="button" className={styles.boton} onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </button>
  );
}
