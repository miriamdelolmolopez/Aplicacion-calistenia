"use client";

import { useState } from "react";
import styles from "../admin.module.css";
import { BarrasHorizontales, BarrasMensuales } from "../estadisticas/Graficos";

export type Opcion = {
  id: string;
  titulo: string;
  nota?: string;
  formato: "n" | "pct" | "veces";
  tipo: "barras" | "mensual";
  filas?: { texto: string; valor: number; detalle?: string }[];
  meses?: { mes: string; total: number }[];
};

const FORMATOS = {
  n: (n: number) => String(n),
  pct: (n: number) => `${n} %`,
  veces: (n: number) => `${n} ${n === 1 ? "vez" : "veces"}`,
};

// Un solo gráfico: eliges qué métrica quieres ver en el desplegable.
export default function GraficoElegible({ opciones }: { opciones: Opcion[] }) {
  const [id, setId] = useState(opciones[0]?.id ?? "");
  const o = opciones.find((x) => x.id === id) ?? opciones[0];
  if (!o) return null;
  const formato = FORMATOS[o.formato];

  return (
    <div>
      <div className={styles.campo}>
        <label htmlFor="metrica">Métrica</label>
        <select id="metrica" value={id} onChange={(e) => setId(e.target.value)}>
          {opciones.map((x) => (
            <option key={x.id} value={x.id}>
              {x.titulo}
            </option>
          ))}
        </select>
      </div>
      {o.nota && <p className={styles.ayuda}>{o.nota}</p>}
      {o.tipo === "mensual" ? (
        (o.meses ?? []).length === 0 ? (
          <p className={styles.ayuda}>Sin datos.</p>
        ) : (
          <BarrasMensuales formato={formato} datos={o.meses ?? []} />
        )
      ) : (o.filas ?? []).length === 0 ? (
        <p className={styles.ayuda}>Sin datos en este periodo.</p>
      ) : (
        <BarrasHorizontales formato={formato} filas={o.filas ?? []} />
      )}
    </div>
  );
}
