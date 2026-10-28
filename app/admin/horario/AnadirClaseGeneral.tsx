"use client";

import { useActionState, useEffect, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { anadirClaseSuelta } from "./acciones";
import estilos from "./horario.module.css";
import type { TipoOpcion } from "./Controles";

// Botón destacado de arriba del todo: añade una clase suelta en el día y la hora que elijas.
export default function AnadirClaseGeneral({ fecha, tipos }: { fecha: string; tipos: TipoOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anadirClaseSuelta, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

  useEffect(() => {
    if (!estado.mensaje) return;
    const t = setTimeout(() => setAbierto(false), 700);
    return () => clearTimeout(t);
  }, [estado]);

  return (
    <>
      <button type="button" className={estilos.anadir} onClick={() => setAbierto(true)}>
        + Añadir clase
      </button>
      {abierto && (
        <div className={estilos.capa} onClick={() => setAbierto(false)}>
          <div className={estilos.modal} role="dialog" aria-modal="true" aria-label="Añadir clase" onClick={(e) => e.stopPropagation()}>
            <h2>Añadir clase</h2>
            <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
              <div className={styles.campo}>
                <label htmlFor="ag-t">Tipo de clase</label>
                <select id="ag-t" name="tipoId" required defaultValue="">
                  <option value="" disabled>
                    Elige…
                  </option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.plazas_max} plazas)
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.campo}>
                <label htmlFor="ag-f">Día</label>
                <input id="ag-f" name="fecha" type="date" required defaultValue={fecha} />
              </div>
              <div className={styles.campo}>
                <label htmlFor="ag-h">Hora</label>
                <input id="ag-h" name="hora" type="time" required />
              </div>
              <div className={styles.campo}>
                <label htmlFor="ag-p">Plazas (vacío = las del tipo)</label>
                <input id="ag-p" name="plazas" type="number" min={1} max={100} />
              </div>
              <div className={styles.campo}>
                <label htmlFor="ag-i">Plazas para invitadas (vacío = las del tipo)</label>
                <input id="ag-i" name="plazas_prueba" type="number" min={0} max={100} />
              </div>
              <button className={styles.boton} type="submit" disabled={pendiente}>
                {pendiente ? "Añadiendo…" : "Añadir clase"}
              </button>
              <button type="button" className={estilos.cerrar} onClick={() => setAbierto(false)}>
                Cerrar
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
      )}
    </>
  );
}
