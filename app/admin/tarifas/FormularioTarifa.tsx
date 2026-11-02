"use client";

import { useActionState, useEffect, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import estilos from "./tarifas.module.css";
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
  { valor: "taller", texto: "Taller (gente externa)" },
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

  // Si el segundo servicio coincide con el primero, se cambia al primero libre.
  const segundoValido = servicio2 && servicio2 !== servicio ? servicio2 : (SERVICIOS.find((s) => s.valor !== servicio)?.valor ?? "");

  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      {tarifa && <input type="hidden" name="id" value={tarifa.id} />}

      <div className={styles.campo}>
        <label htmlFor={`tf-n-${p}`}>Nombre <AyudaI texto="Cómo se llama el servicio o tarifa. Es lo que ves al cobrar y lo que ve la persona." /></label>
        <input id={`tf-n-${p}`} name="nombre" required maxLength={80} defaultValue={tarifa?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tf-o-${p}`}>Orden de aparición <AyudaI texto="Para decidir cuál sale antes en las listas. Los números más bajos salen primero (1 sale el primero)." /></label>
        <input id={`tf-o-${p}`} name="orden" type="number" min={0} max={9999} defaultValue={tarifa?.orden ?? 0} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={tarifa?.activo ?? true} />
        <span>Activa <AyudaI texto="Si la desmarcas, no se puede dar de alta a nadie con ella. Lo que ya se ha vendido se mantiene." /></span>
      </label>

      <div className={styles.campo}>
        <label htmlFor={`tf-p-${p}`}>Precio (€, IVA incluido) <AyudaI texto="Lo que paga la persona, con el IVA ya sumado. Por ejemplo 55 o 55,50." /></label>
        <input
          id={`tf-p-${p}`}
          name="precio"
          inputMode="decimal"
          required
          defaultValue={tarifa ? (tarifa.precio_centimos / 100).toFixed(2).replace(".", ",") : ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`tf-i-${p}`}>Tipo de IVA <AyudaI texto="El IVA incluido en el precio. Sirve para calcular la base y la cuota que salen en la factura." /></label>
        <select id={`tf-i-${p}`} name="iva_porcentaje" defaultValue={tarifa?.iva_porcentaje ?? 21}>
          {TIPOS_IVA.map((i) => (
            <option key={i.valor} value={i.valor}>
              {i.texto}
            </option>
          ))}
        </select>
      </div>

      <h3 style={{ margin: "8px 0 0", fontSize: "1.05rem" }}>Servicios que ofrece</h3>

      <fieldset className={styles.grupo}>
        <div className={estilos.servicioFila}>
          <div className={styles.campo}>
            <label htmlFor={`tf-s-${p}`}>Servicio <AyudaI texto="Qué ofrece: clases presenciales (grupales o individuales) o entrenamiento online 1:1." /></label>
            <select id={`tf-s-${p}`} name="servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
              {SERVICIOS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`tf-v-${p}`}>Días de validez <AyudaI texto="Cuántos días dura el servicio desde que empieza. 30 días = un mes, 60 = dos meses, 90 = tres meses." /></label>
            <input id={`tf-v-${p}`} name="validez_dias" type="number" min={1} max={1095} required defaultValue={tarifa?.validez_dias ?? 30} />
          </div>
        </div>
        {servicio === "online" ? (
          // Los entrenos incluidos del plan online no se piden: se conserva lo que ya tenía (para el círculo de progreso).
          <input type="hidden" name="clases" value={tarifa && tarifa.servicio === "online" ? tarifa.clases : 12} />
        ) : (
          <div className={styles.campo}>
            <label htmlFor={`tf-c-${p}`}>Clases que incluye <AyudaI texto="Cuántas clases (créditos) puede reservar la persona con este servicio mientras dure." /></label>
            <input id={`tf-c-${p}`} name="clases" type="number" min={1} max={100} required defaultValue={tarifa && tarifa.servicio !== "online" ? tarifa.clases : 4} />
          </div>
        )}
        <span className={styles.ayuda}>30 días = un mes, 60 = dos meses, 90 = tres meses.</span>
      </fieldset>

      {otro && (
        <fieldset className={styles.grupo}>
          <div className={estilos.servicioFila}>
            <div className={styles.campo}>
              <label htmlFor={`tf-s2-${p}`}>Servicio <AyudaI texto="El segundo servicio de una tarifa combinada. Tiene que ser distinto del primero." /></label>
              <select id={`tf-s2-${p}`} name="servicio2" value={segundoValido} onChange={(e) => setServicio2(e.target.value)}>
                {SERVICIOS.filter((s) => s.valor !== servicio).map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.texto}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.campo}>
              <label htmlFor={`tf-v2-${p}`}>Días de validez <AyudaI texto="Cuántos días dura este segundo servicio. Puede ser distinto del primero." /></label>
              <input id={`tf-v2-${p}`} name="validez_dias2" type="number" min={1} max={1095} required defaultValue={tarifa?.validez_dias2 ?? tarifa?.validez_dias ?? 30} />
            </div>
          </div>
          {segundoValido === "online" ? (
            <input type="hidden" name="clases2" value={tarifa?.servicio2 === "online" && tarifa.clases2 ? tarifa.clases2 : 12} />
          ) : (
            <div className={styles.campo}>
              <label htmlFor={`tf-c2-${p}`}>Clases que incluye <AyudaI texto="Cuántas clases (créditos) incluye este segundo servicio." /></label>
              <input id={`tf-c2-${p}`} name="clases2" type="number" min={1} max={100} required defaultValue={tarifa?.clases2 ?? 4} />
            </div>
          )}
        </fieldset>
      )}

      {!otro && (
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setOtro(true)}>
          + Añadir otro servicio (para una tarifa combinada)
        </button>
      )}

      {!otro && (
        <label className={styles.casilla}>
          <input type="checkbox" name="requiere_pago" defaultChecked={tarifa?.requiere_pago ?? false} />
          <span>Solo se activa cuando se paga <AyudaI texto="Si la marcas, la persona no puede usar el servicio hasta que el pago esté cobrado. Si no, puede reservar aunque el pago esté pendiente." /></span>
        </label>
      )}

      {otro && (
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
