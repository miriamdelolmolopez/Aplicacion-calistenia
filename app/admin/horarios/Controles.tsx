"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
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

export function NuevaPlantilla() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearPlantilla, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Nueva plantilla</h2>
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
      <strong>Aplicar a semanas concretas</strong>
      <p className={styles.ayuda}>
        Elige cualquier día de la primera semana. Se crean las clases que falten de lunes a domingo; las que ya
        existen y sus reservas no se tocan.
      </p>
      <div className={styles.campo}>
        <label htmlFor={`ap-f-${id}`}>Primera semana (cualquier día de ella)</label>
        <input id={`ap-f-${id}`} name="fecha" type="date" defaultValue={hoy} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`ap-s-${id}`}>¿Cuántas semanas?</label>
        <select id={`ap-s-${id}`} name="semanas" defaultValue="1">
          {[1, 2, 3, 4, 6, 8, 12].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "semana" : "semanas"}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear las clases"}
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
