"use client";

import { useState } from "react";
import PanelFiltros from "../../PanelFiltros";
import { euros } from "@/lib/formato";
import styles from "../admin.module.css";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";

export type FilaPago = {
  id: string;
  persona: string;
  tarifa: string;
  importe: number; // céntimos
  descuento: number; // céntimos
  metodo: string;
  metodoNombre: string;
  estado: string; // pagado | pendiente | anulado
  fecha: string; // instante ISO (cuándo se cobró, o cuándo se creó si sigue pendiente)
};

const ESTADOS: Record<string, string> = { pagado: "Cobrado", pendiente: "Pendiente", anulado: "Anulado" };

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
}

// Historial de todos los pagos. Arriba: buscar por persona o tarifa y filtrar con el embudo.
export default function HistorialPagos({ pagos }: { pagos: FilaPago[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [metodo, setMetodo] = useState("todos");
  const [tarifa, setTarifa] = useState("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const tarifas = [...new Set(pagos.map((p) => p.tarifa))].sort((a, b) => a.localeCompare(b, "es"));
  const metodos = [...new Map(pagos.map((p) => [p.metodo, p.metodoNombre])).entries()];

  const dia = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const q = busqueda.trim().toLowerCase();
  const visibles = pagos.filter(
    (p) =>
      (q === "" || p.persona.toLowerCase().includes(q) || p.tarifa.toLowerCase().includes(q)) &&
      (estado === "todos" || p.estado === estado) &&
      (metodo === "todos" || p.metodo === metodo) &&
      (tarifa === "todas" || p.tarifa === tarifa) &&
      (desde === "" || dia(p.fecha) >= desde) &&
      (hasta === "" || dia(p.fecha) <= hasta),
  );
  const filtros = [estado !== "todos", metodo !== "todos", tarifa !== "todas", desde !== "", hasta !== ""].filter(Boolean).length;
  const total = visibles.filter((p) => p.estado === "pagado").reduce((s, p) => s + p.importe, 0);

  return (
    <div>
      <PanelFiltros activos={filtros} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar persona o tarifa…" />}>
        <div className={styles.campo}>
          <label htmlFor="hp-estado">Estado</label>
          <select id="hp-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pagado">Cobrados</option>
            <option value="pendiente">Pendientes</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="hp-metodo">Forma de pago</label>
          <select id="hp-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="todos">Todas</option>
            {metodos.map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="hp-tarifa">Tarifa</label>
          <select id="hp-tarifa" value={tarifa} onChange={(e) => setTarifa(e.target.value)}>
            <option value="todas">Todas</option>
            {tarifas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="hp-desde">Desde</label>
          <input id="hp-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="hp-hasta">Hasta</label>
          <input id="hp-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </PanelFiltros>

      <p className={styles.ayuda}>
        {visibles.length} {visibles.length === 1 ? "pago" : "pagos"} · cobrado en estos: <strong>{euros(total)}</strong>
      </p>
      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay pagos con ese filtro.</p>}
      {visibles.map((p) => (
        <div key={p.id} className={comunes.fila}>
          <div>
            <strong>{p.persona}</strong>
            <div className={styles.ayuda}>
              {p.tarifa} · {p.metodoNombre} · {fechaHora(p.fecha)}
              {p.descuento > 0 && ` · descuento −${euros(p.descuento)}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>{euros(p.importe)}</strong>
            <div>
              <span className={p.estado === "pagado" ? styles.etiquetaSuave : styles.etiqueta}>{ESTADOS[p.estado] ?? p.estado}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
