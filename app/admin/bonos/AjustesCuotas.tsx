"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { guardarAjustesCuotas } from "./acciones";

export default function AjustesCuotas({ margen, aviso }: { margen: number; aviso: number }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarAjustesCuotas, {});
  return (
    <form action={accion}>
      <div className={styles.campo}>
        <label htmlFor="aj-margen">
          Días de margen tras el vencimiento{" "}
          <AyudaI texto="Si una cuota no se paga, la persona sigue usando su tarifa estos días. Pasados, la tarifa se pausa hasta que se cobre. Pon 0 para pausarla al día siguiente del vencimiento." />
        </label>
        <input id="aj-margen" name="margen" type="number" min={0} max={90} defaultValue={margen} required style={{ maxWidth: 120 }} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="aj-aviso">
          Avisar a la persona (días antes){" "}
          <AyudaI texto="Cuántos días antes del vencimiento le llega el aviso por correo y por la app. También se le avisa el mismo día del vencimiento." />
        </label>
        <input id="aj-aviso" name="aviso" type="number" min={0} max={30} defaultValue={aviso} required style={{ maxWidth: 120 }} />
      </div>
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar"}
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
