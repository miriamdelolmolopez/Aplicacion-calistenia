"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { useEnvio } from "../useEnvio";
import { crearTaller, editarTaller } from "./acciones";

export type TallerForm = {
  sesionId: string;
  nombre: string;
  nombreEn: string;
  fecha: string;
  hora: string;
  duracion: number;
  plazas: number;
  modalidad: "presencial" | "online";
  ubicacion: string;
  enlace: string;
};

// Crear un taller nuevo o cambiar uno que ya existe.
export default function FormularioTaller({ taller, hoy, alTerminar }: { taller?: TallerForm; hoy: string; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(taller ? editarTaller : crearTaller, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !taller);
  const [modalidad, setModalidad] = useState<"presencial" | "online">(taller?.modalidad ?? "presencial");

  // Al guardar con éxito, se cierra solo tras un momento (para que se vea el mensaje).
  const cerrar = useRef(alTerminar);
  useEffect(() => {
    cerrar.current = alTerminar;
  });
  useEffect(() => {
    if (!estado.mensaje) return;
    const espera = setTimeout(() => cerrar.current?.(), 900);
    return () => clearTimeout(espera);
  }, [estado]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      {taller && <input type="hidden" name="sesionId" value={taller.sesionId} />}
      <div className={styles.campo}>
        <label htmlFor="tl-nombre">
          Nombre del taller <AyudaI texto="Cómo se llama el taller, por ejemplo «Taller de pino». Si repites el mismo nombre otro día, es el mismo taller en otra fecha." />
        </label>
        <input id="tl-nombre" name="nombre" maxLength={60} defaultValue={taller?.nombre} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-nombre-en">
          Nombre en inglés (opcional) <AyudaI texto="Cómo se llama el taller cuando la app está en inglés. Si lo dejas vacío, sale el nombre en español." />
        </label>
        <input id="tl-nombre-en" name="nombre_en" maxLength={80} defaultValue={taller?.nombreEn ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-fecha">Día</label>
        <input id="tl-fecha" name="fecha" type="date" min={taller ? undefined : hoy} defaultValue={taller?.fecha ?? hoy} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-hora">Hora de inicio</label>
        <input id="tl-hora" name="hora" type="time" defaultValue={taller?.hora ?? "10:00"} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-duracion">
          Duración (minutos) <AyudaI texto="Cuánto dura el taller. Con esto se calcula la hora a la que termina y lo que sale en Google Calendar." />
        </label>
        <input id="tl-duracion" name="duracion" type="number" min={10} max={240} defaultValue={taller?.duracion ?? 90} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-plazas">Plazas</label>
        <input id="tl-plazas" name="plazas" type="number" min={1} max={100} defaultValue={taller?.plazas ?? 10} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="tl-modalidad">¿Presencial u online?</label>
        <select id="tl-modalidad" name="modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value as "presencial" | "online")}>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
        </select>
      </div>
      {modalidad === "presencial" ? (
        <div className={styles.campo}>
          <label htmlFor="tl-ubicacion">
            Ubicación <AyudaI texto="Dónde es el taller. Sale en el calendario de las personas apuntadas y en Google Calendar." />
          </label>
          <input id="tl-ubicacion" name="ubicacion" maxLength={150} defaultValue={taller?.ubicacion} placeholder="Calle, ciudad…" />
        </div>
      ) : (
        <div className={styles.campo}>
          <label htmlFor="tl-enlace">
            Enlace de la videollamada <AyudaI texto="El enlace para entrar al taller online (Meet, Zoom…). Sale en el calendario de las personas apuntadas." />
          </label>
          <input id="tl-enlace" name="enlace" type="url" maxLength={300} defaultValue={taller?.enlace} placeholder="https://…" />
        </div>
      )}
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : taller ? "Guardar cambios" : "Crear taller"}
      </button>
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
