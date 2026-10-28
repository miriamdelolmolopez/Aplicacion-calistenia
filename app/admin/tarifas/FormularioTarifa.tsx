"use client";

import { useActionState, useEffect, useState } from "react";
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
  iva_porcentaje: number;
  validez_dias2: number | null;
};

export const SERVICIOS = [
  { valor: "grupal", texto: "Presencial grupal" },
  { valor: "individual", texto: "Presencial individual" },
  { valor: "online", texto: "Online 1:1" },
];

const TIPOS_IVA = [
  { valor: 21, texto: "21 % (general)" },
  { valor: 10, texto: "10 % (reducido)" },
  { valor: 4, texto: "4 % (superreducido)" },
  { valor: 0, texto: "0 % (exento)" },
];

// Crear (sin tarifa) o editar (con tarifa). Según el servicio que se elija salen unas opciones u otras.
export default function FormularioTarifa({ tarifa, alTerminar }: { tarifa?: TipoBono; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarTipoBono, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !tarifa);
  const p = tarifa?.id ?? "nueva";

  const [servicio, setServicio] = useState(tarifa?.servicio ?? "grupal");
  const [otro, setOtro] = useState(!!tarifa?.servicio2);
  const [servicio2, setServicio2] = useState(tarifa?.servicio2 ?? "");
  const [misma, setMisma] = useState(tarifa ? tarifa.validez_dias2 === null : true);

  // Si el segundo servicio coincide con el primero, se cambia al primero libre.
  const segundoValido = servicio2 && servicio2 !== servicio ? servicio2 : (SERVICIOS.find((s) => s.valor !== servicio)?.valor ?? "");

  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={`${styles.tarjeta} ${styles.formularioInterno}`}>
      {tarifa && <input type="hidden" name="id" value={tarifa.id} />}

      <div className={styles.campo}>
        <label htmlFor={`tf-n-${p}`}>Nombre</label>
        <input id={`tf-n-${p}`} name="nombre" required maxLength={80} defaultValue={tarifa?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tf-o-${p}`}>Orden de aparición (1 sale primero)</label>
        <input id={`tf-o-${p}`} name="orden" type="number" min={0} max={9999} defaultValue={tarifa?.orden ?? 0} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={tarifa?.activo ?? true} />
        <span>Activa (si la desmarcas, no se puede dar de alta a nadie con ella)</span>
      </label>

      <div className={styles.campo}>
        <label htmlFor={`tf-s-${p}`}>¿A qué servicio afecta?</label>
        <select id={`tf-s-${p}`} name="servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
          {SERVICIOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.texto}
            </option>
          ))}
        </select>
      </div>

      {servicio === "online" ? (
        <div className={styles.campo}>
          <label htmlFor={`tf-c-${p}`}>Entrenos incluidos (para el círculo de progreso de la alumna)</label>
          <input id={`tf-c-${p}`} name="clases" type="number" min={1} max={100} required defaultValue={tarifa && tarifa.servicio === "online" ? tarifa.clases : 12} />
          <span className={styles.ayuda}>Los entrenos que haga desde la app cuentan hasta este número.</span>
        </div>
      ) : (
        <div className={styles.campo}>
          <label htmlFor={`tf-c-${p}`}>Créditos (cuántas clases incluye)</label>
          <input id={`tf-c-${p}`} name="clases" type="number" min={1} max={100} required defaultValue={tarifa && tarifa.servicio !== "online" ? tarifa.clases : 4} />
        </div>
      )}

      <div className={styles.campo}>
        <label htmlFor={`tf-p-${p}`}>Precio (€, IVA incluido)</label>
        <input
          id={`tf-p-${p}`}
          name="precio"
          inputMode="decimal"
          required
          defaultValue={tarifa ? (tarifa.precio_centimos / 100).toFixed(2).replace(".", ",") : ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tf-i-${p}`}>Tipo de IVA</label>
        <select id={`tf-i-${p}`} name="iva_porcentaje" defaultValue={tarifa?.iva_porcentaje ?? 21}>
          {TIPOS_IVA.map((i) => (
            <option key={i.valor} value={i.valor}>
              {i.texto}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tf-v-${p}`}>Días de validez (cuándo caduca)</label>
        <input id={`tf-v-${p}`} name="validez_dias" type="number" min={1} max={1095} required defaultValue={tarifa?.validez_dias ?? 30} />
        <span className={styles.ayuda}>30 = un mes, 60 = dos meses, 90 = tres meses.</span>
      </div>

      {!otro ? (
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setOtro(true)}>
          + Añadir otro servicio (para una tarifa combinada)
        </button>
      ) : (
        <fieldset className={styles.grupo}>
          <legend>Otro servicio incluido</legend>
          <div className={styles.campo}>
            <label htmlFor={`tf-s2-${p}`}>Servicio</label>
            <select id={`tf-s2-${p}`} name="servicio2" value={segundoValido} onChange={(e) => setServicio2(e.target.value)}>
              {SERVICIOS.filter((s) => s.valor !== servicio).map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
          {segundoValido === "online" ? (
            <div className={styles.campo}>
              <label htmlFor={`tf-c2-${p}`}>Entrenos incluidos</label>
              <input id={`tf-c2-${p}`} name="clases2" type="number" min={1} max={100} required defaultValue={tarifa?.servicio2 === "online" && tarifa.clases2 ? tarifa.clases2 : 12} />
            </div>
          ) : (
            <div className={styles.campo}>
              <label htmlFor={`tf-c2-${p}`}>Créditos de este servicio</label>
              <input id={`tf-c2-${p}`} name="clases2" type="number" min={1} max={100} required defaultValue={tarifa?.clases2 ?? 4} />
            </div>
          )}
          <div className={styles.campo}>
            <label htmlFor={`tf-v2-${p}`}>Días de validez de este servicio</label>
            <input
              id={`tf-v2-${p}`}
              name="validez_dias2"
              type="number"
              min={1}
              max={1095}
              disabled={misma}
              defaultValue={tarifa?.validez_dias2 ?? tarifa?.validez_dias ?? 30}
            />
          </div>
          <label className={styles.casilla}>
            <input type="checkbox" name="misma_duracion" checked={misma} onChange={(e) => setMisma(e.target.checked)} />
            <span>La misma duración que el primero</span>
          </label>
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            onClick={() => {
              setOtro(false);
              setServicio2("");
            }}
          >
            Quitar este servicio
          </button>
        </fieldset>
      )}

      {!otro && (
        <label className={styles.casilla}>
          <input type="checkbox" name="requiere_pago" defaultChecked={tarifa?.requiere_pago ?? false} />
          <span>Solo se activa cuando se paga (si no, la alumna puede reservar aunque el pago esté pendiente)</span>
        </label>
      )}

      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : tarifa ? "Guardar cambios" : "Crear tarifa"}
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
