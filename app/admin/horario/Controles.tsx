"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import CalendarioMes from "../CalendarioMes";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { anadirClaseSuelta, aplicarPlantillaDias, cambiarHoraClase } from "./acciones";

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

export type TipoOpcion = { id: string; nombre: string; plazas_max: number; plazas_prueba: number };

// Añadir una clase suelta a un día.
export function AnadirClase({ fecha, tipos }: { fecha: string; tipos: TipoOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anadirClaseSuelta, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);
  return (
    <details className={styles.detalles}>
      <summary>+ Añadir clase</summary>
      <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
        <input type="hidden" name="fecha" value={fecha} />
        <div className={styles.campo}>
          <label htmlFor={`ac-t-${fecha}`}>Tipo de clase</label>
          <select id={`ac-t-${fecha}`} name="tipoId" required defaultValue="">
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
          <label htmlFor={`ac-h-${fecha}`}>Hora</label>
          <input id={`ac-h-${fecha}`} name="hora" type="time" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`ac-p-${fecha}`}>Plazas (vacío = las del tipo)</label>
          <input id={`ac-p-${fecha}`} name="plazas" type="number" min={1} max={100} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendiente}>
          {pendiente ? "Añadiendo…" : "Añadir clase"}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}

// Cambiar el día y la hora de una clase.
export function CambiarHora({ id, fecha, hora }: { id: string; fecha: string; hora: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarHoraClase, {});
  const { ref, alEnviar } = useEnvio(accion, estado, false);
  return (
    <details className={styles.detalles}>
      <summary>Cambiar día u hora</summary>
      <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
        <input type="hidden" name="sesionId" value={id} />
        <p className={styles.ayuda}>Las personas apuntadas verán la clase en su nueva hora.</p>
        <div className={styles.campo}>
          <label htmlFor={`ch-f-${id}`}>Día</label>
          <input id={`ch-f-${id}`} name="fecha" type="date" required defaultValue={fecha} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`ch-h-${id}`}>Hora</label>
          <input id={`ch-h-${id}`} name="hora" type="time" required defaultValue={hora} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambio"}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}

// Calendario del Horario: al elegir una semana, la pantalla pasa a esa semana.
export function CalendarioSemana({
  hoy,
  semana,
  marcados,
}: {
  hoy: string;
  semana: string;
  marcados: Record<string, number>;
}) {
  const router = useRouter();
  return (
    <CalendarioMes
      modo="semana"
      hoy={hoy}
      mesInicial={semana.slice(0, 7)}
      semana={semana}
      marcados={marcados}
      alElegirSemana={(lunes) => router.push(`/admin/horario?semana=${lunes}`, { scroll: false })}
    />
  );
}

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function textoFecha(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES_LARGOS[m - 1].slice(0, 3)}`;
}

// Aplicar una plantilla de horario a los días que elijas a mano en el calendario.
export function AplicarPlantilla({
  plantillas,
  hoy,
  mesInicial,
  marcados,
}: {
  plantillas: { id: string; nombre: string; principal: boolean }[];
  hoy: string;
  mesInicial: string;
  marcados: Record<string, number>;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(aplicarPlantillaDias, {});
  const { ref, alEnviar } = useEnvio(accion, estado, false);
  const [dias, setDias] = useState<string[]>([]);
  const ordenados = [...dias].sort();
  return (
    <details className={styles.detalles}>
      <summary>Aplicar una plantilla a días que elijas</summary>
      <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
        <p className={styles.ayuda}>
          Elige la plantilla y marca en el calendario los días en los que quieres aplicarla (cualquier mes). Solo se
          crean las clases que falten: las que ya existen y sus reservas no se tocan.
        </p>
        <div className={styles.campo}>
          <label htmlFor="ap-plantilla">Plantilla</label>
          <select id="ap-plantilla" name="plantilla" required defaultValue={plantillas.find((p) => p.principal)?.id ?? ""}>
            <option value="" disabled>
              Elige…
            </option>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.principal ? " (principal)" : ""}
              </option>
            ))}
          </select>
        </div>
        <CalendarioMes
          modo="dias"
          hoy={hoy}
          mesInicial={mesInicial}
          seleccionados={dias}
          marcados={marcados}
          alCambiarDias={setDias}
        />
        {ordenados.map((d) => (
          <input key={d} type="hidden" name="dias" value={d} />
        ))}
        <p className={styles.ayuda}>
          {ordenados.length === 0
            ? "Todavía no has marcado ningún día."
            : `Días elegidos (${ordenados.length}): ${ordenados.map(textoFecha).join(", ")}`}
        </p>
        {ordenados.length > 0 && (
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            onClick={() => setDias([])}
          >
            Quitar la selección
          </button>
        )}
        <button className={styles.boton} type="submit" disabled={pendiente || ordenados.length === 0}>
          {pendiente ? "Aplicando…" : `Confirmar y aplicar a ${ordenados.length} ${ordenados.length === 1 ? "día" : "días"}`}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}
