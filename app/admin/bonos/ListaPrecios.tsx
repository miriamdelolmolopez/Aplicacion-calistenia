"use client";

import { useState } from "react";
import PanelFiltros from "../../PanelFiltros";
import { euros } from "@/lib/formato";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import PanelCompleto from "../comunes/PanelCompleto";
import { FormularioPrecio } from "./Controles";

export type PrecioTarifa = { id: string; nombre: string; servicio: string; precio_centimos: number; iva: number; activo: boolean };

const SERVICIO: Record<string, string> = { grupal: "Presencial grupal", individual: "Presencial individual", online: "Online 1:1" };

// El precio que paga la alumna lleva IVA incluido: aquí se ve también la base imponible y el IVA.
export function desglose(precioCentimos: number, iva: number): { base: number; cuota: number } {
  const base = Math.round(precioCentimos / (1 + iva / 100));
  return { base, cuota: precioCentimos - base };
}

export default function ListaPrecios({ tarifas }: { tarifas: PrecioTarifa[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [servicio, setServicio] = useState("todos");
  const [editando, setEditando] = useState<string | null>(null);

  const q = busqueda.trim().toLowerCase();
  const visibles = tarifas.filter((t) => t.nombre.toLowerCase().includes(q) && (servicio === "todos" || t.servicio === servicio));
  const abierta = tarifas.find((t) => t.id === editando);

  return (
    <div>
      <PanelFiltros activos={servicio !== "todos" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar tarifa…" />}>
        <div className={styles.campo}>
          <label htmlFor="lp-servicio">Servicio</label>
          <select id="lp-servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
            <option value="todos">Todos</option>
            {Object.entries(SERVICIO).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </PanelFiltros>

      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay tarifas con ese filtro.</p>}
      {visibles.map((t) => {
        const d = desglose(t.precio_centimos, t.iva);
        return (
          <div key={t.id} className={comunes.fila}>
            <div>
              <strong>{t.nombre}</strong>
              <div className={styles.ayuda}>
                {SERVICIO[t.servicio] ?? t.servicio}
                {!t.activo && " · desactivada"}
              </div>
              <div className={styles.ayuda}>
                <strong>{euros(t.precio_centimos)}</strong> · base imponible {euros(d.base)} + IVA {t.iva} % ({euros(d.cuota)})
              </div>
            </div>
            <AccionesFila nombre={t.nombre} alEditar={() => setEditando(t.id)} />
          </div>
        );
      })}

      {abierta && (
        <PanelCompleto titulo={`Precio de ${abierta.nombre}`} cerrar={() => setEditando(null)}>
          <div className={styles.tarjeta}>
            <p className={styles.ayuda}>
              Precio con IVA incluido ({abierta.iva} %). Cambiarlo no afecta a los bonos ya registrados. El tipo de IVA se cambia en Tarifas.
            </p>
            <FormularioPrecio tipo={{ id: abierta.id, nombre: abierta.nombre, precio: (abierta.precio_centimos / 100).toFixed(2).replace(".", ",") }} />
          </div>
        </PanelCompleto>
      )}
    </div>
  );
}
