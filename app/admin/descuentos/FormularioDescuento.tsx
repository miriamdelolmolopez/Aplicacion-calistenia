"use client";

import { useActionState, useEffect, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { guardarDescuento } from "./acciones";

export type DescuentoDatos = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  activo: boolean;
  caduca_en: string | null;
  usos_max: number | null;
};

// Crear (sin descuento) o editar (con descuento).
export default function FormularioDescuento({ descuento, alTerminar }: { descuento?: DescuentoDatos; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarDescuento, {});
  const [tipo, setTipo] = useState(descuento?.tipo ?? "porcentaje");
  const p = descuento?.id ?? "nuevo";

  useEffect(() => {
    if (!estado.mensaje || !alTerminar) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);

  const valorInicial = descuento ? (descuento.tipo === "porcentaje" ? String(descuento.valor) : (descuento.valor / 100).toFixed(2).replace(".", ",")) : "";

  return (
    <form action={accion} className={styles.tarjeta}>
      {descuento && <input type="hidden" name="id" value={descuento.id} />}
      <div className={styles.campo}>
        <label htmlFor={`d-n-${p}`}>Nombre (por ejemplo «Alumnas de siempre»)</label>
        <input id={`d-n-${p}`} name="nombre" maxLength={60} required defaultValue={descuento?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`d-t-${p}`}>Tipo</label>
        <select id={`d-t-${p}`} name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="porcentaje">Porcentaje (%)</option>
          <option value="euros">Importe fijo (€)</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`d-v-${p}`}>{tipo === "porcentaje" ? "Porcentaje (1 a 100)" : "Importe en euros"}</label>
        <input id={`d-v-${p}`} name="valor" inputMode="decimal" required defaultValue={valorInicial} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`d-c-${p}`}>Caduca el (opcional)</label>
        <input id={`d-c-${p}`} name="caduca_en" type="date" defaultValue={descuento?.caduca_en ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`d-u-${p}`}>Máximo de veces que se puede usar (opcional)</label>
        <input id={`d-u-${p}`} name="usos_max" type="number" min={1} max={10000} defaultValue={descuento?.usos_max ?? ""} />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={descuento?.activo ?? true} />
        <span>Activo (si lo desmarcas, no se puede aplicar)</span>
      </label>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : descuento ? "Guardar cambios" : "Crear descuento"}
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
