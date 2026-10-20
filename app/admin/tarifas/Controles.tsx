"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { guardarTipoBono } from "./acciones";

export type TipoBono = {
  id: string;
  nombre: string;
  servicio: string;
  clases: number;
  precio_centimos: number;
  validez_dias: number;
  orden: number;
  activo: boolean;
  requiere_pago: boolean;
  servicio2: string | null;
  clases2: number | null;
};

const SERVICIOS = [
  { valor: "grupal", texto: "Clases grupales" },
  { valor: "individual", texto: "Entrenamiento individual" },
  { valor: "online", texto: "Entrenamiento online" },
];

// Crear (sin tipo) o editar (con tipo) un bono o clase suelta.
export function FormularioTipoBono({ tipo, suelta = false }: { tipo?: TipoBono; suelta?: boolean }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarTipoBono, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !tipo);
  const p = tipo?.id ?? "nuevo";

  return (
    <form ref={ref} onSubmit={alEnviar} className={tipo ? styles.formularioInterno : styles.tarjeta}>
      {tipo ? <input type="hidden" name="id" value={tipo.id} /> : <h2>{suelta ? "Nueva clase suelta" : "Nuevo bono"}</h2>}

      <div className={styles.campo}>
        <label htmlFor={`tb-n-${p}`}>Nombre</label>
        <input id={`tb-n-${p}`} name="nombre" required maxLength={80} defaultValue={tipo?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tb-o-${p}`}>Orden de aparición (1 sale primero)</label>
        <input id={`tb-o-${p}`} name="orden" type="number" min={0} max={9999} defaultValue={tipo?.orden ?? 0} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={tipo?.activo ?? true} />
        <span>Activo (si lo desmarcas, no se puede dar de alta a nadie con él)</span>
      </label>

      <div className={styles.campo}>
        <label htmlFor={`tb-s-${p}`}>Para qué servicio es</label>
        <select id={`tb-s-${p}`} name="servicio" defaultValue={tipo?.servicio ?? "grupal"}>
          {SERVICIOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.texto}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tb-c-${p}`}>Créditos (número de clases)</label>
        <input id={`tb-c-${p}`} name="clases" type="number" min={1} max={100} required defaultValue={tipo?.clases ?? (suelta ? 1 : 4)} />
        <span className={styles.ayuda}>La app lleva la cuenta de las clases que le quedan. Para un plan online, pon 1.</span>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tb-p-${p}`}>Precio (€, IVA incluido)</label>
        <input
          id={`tb-p-${p}`}
          name="precio"
          inputMode="decimal"
          required
          defaultValue={tipo ? (tipo.precio_centimos / 100).toFixed(2).replace(".", ",") : ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tb-v-${p}`}>Días de validez (cuándo caduca)</label>
        <input id={`tb-v-${p}`} name="validez_dias" type="number" min={1} max={1095} required defaultValue={tipo?.validez_dias ?? 30} />
        <span className={styles.ayuda}>30 = un mes, 60 = dos meses, 90 = tres meses.</span>
      </div>

      <fieldset className={styles.grupo}>
        <legend>Combo (opcional)</legend>
        <p className={styles.ayuda}>Para un bono que incluye otro servicio a la vez (por ejemplo 4 personales + 4 grupales con un solo pago).</p>
        <div className={styles.campo}>
          <label htmlFor={`tb-s2-${p}`}>Además incluye</label>
          <select id={`tb-s2-${p}`} name="servicio2" defaultValue={tipo?.servicio2 ?? ""}>
            <option value="">Nada más</option>
            {SERVICIOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.texto}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor={`tb-c2-${p}`}>Créditos de ese segundo servicio</label>
          <input id={`tb-c2-${p}`} name="clases2" type="number" min={1} max={100} defaultValue={tipo?.clases2 ?? ""} />
        </div>
      </fieldset>

      <label className={styles.casilla}>
        <input type="checkbox" name="requiere_pago" defaultChecked={tipo?.requiere_pago ?? false} />
        <span>Solo se activa cuando se paga (si no, la alumna puede reservar aunque el pago esté pendiente)</span>
      </label>

      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : tipo ? "Guardar cambios" : "Crear"}
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
  );
}
