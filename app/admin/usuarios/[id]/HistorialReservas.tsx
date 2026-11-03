"use client";

import { useState } from "react";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import type { Periodo, ReservaFila } from "./periodos";

type Estado = "proxima" | "asistio" | "no_vino" | "sin_marcar" | "cancelada";

const ETIQUETAS: Record<Estado, string> = { proxima: "Próximas", asistio: "Asistió", no_vino: "No vino", sin_marcar: "Sin marcar", cancelada: "Canceladas" };
const TODOS: Estado[] = ["proxima", "asistio", "no_vino", "sin_marcar", "cancelada"];

const dmy = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

// Cada reserva se clasifica en uno de estos estados, para poder filtrarlas.
function estadoDe(r: ReservaFila, ahoraIso: string): Estado {
  if (r.estado === "cancelada") return "cancelada";
  if (r.asistencia === "asistio") return "asistio";
  if (r.asistencia === "no_asistio") return "no_vino";
  return `${r.dia}T${r.hora}` > ahoraIso ? "proxima" : "sin_marcar";
}

// Historial de reservas de una persona, de la más reciente a la más antigua, con filtros.
export default function HistorialReservas({ reservas, periodos, ahora }: { reservas: ReservaFila[]; periodos: Periodo[]; ahora: string }) {
  const [activos, setActivos] = useState<Estado[]>(TODOS);
  const [periodo, setPeriodo] = useState("todos");

  const ahoraLocal = ahora; // AAAA-MM-DDTHH:MM en hora de Madrid
  const ids = periodo === "todos" ? null : new Set(periodos.find((p) => p.id === periodo)?.bonos.map((b) => b.id) ?? []);
  const lista = reservas
    .filter((r) => !ids || (r.bonoId && ids.has(r.bonoId)))
    .map((r) => ({ r, e: estadoDe(r, ahoraLocal) }))
    .filter((x) => activos.includes(x.e))
    .sort((a, b) => `${b.r.dia}T${b.r.hora}`.localeCompare(`${a.r.dia}T${a.r.hora}`));
  const cuenta = (e: Estado) => reservas.filter((r) => (!ids || (r.bonoId && ids.has(r.bonoId))) && estadoDe(r, ahoraLocal) === e).length;

  const marcar = (e: Estado) => setActivos((a) => (a.includes(e) ? a.filter((x) => x !== e) : [...a, e]));

  return (
    <section className={styles.tarjeta}>
      <h2>Historial de reservas</h2>
      <div className={estilos.filtrosHist}>
        {TODOS.map((e) => (
          <label key={e} className={styles.casilla}>
            <input type="checkbox" checked={activos.includes(e)} onChange={() => marcar(e)} />
            {ETIQUETAS[e]} ({cuenta(e)})
          </label>
        ))}
      </div>
      {periodos.length > 1 && (
        <div className={styles.campo}>
          <label htmlFor="hist-periodo">Tarifa</label>
          <select id="hist-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="todos">Todas</option>
            {periodos
              .filter((p) => p.estado !== "en_cola")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.desde && p.hasta ? ` · ${dmy(p.desde)} – ${dmy(p.hasta)}` : ""}
                </option>
              ))}
          </select>
        </div>
      )}
      <p className={styles.ayuda} style={{ margin: 0 }}>
        {lista.length} {lista.length === 1 ? "reserva" : "reservas"}
      </p>
      {lista.length === 0 && <p className={styles.ayuda}>No hay reservas con esos filtros.</p>}
      <ul className={estilos.listaHist}>
        {lista.map(({ r, e }) => (
          <li key={r.id} className={`${estilos.filaHist} ${e === "cancelada" ? estilos.filaCancelada : ""}`}>
            <span className={estilos.puntoClase} style={{ background: r.color }} aria-hidden="true" />
            <span className={estilos.histTexto}>
              <strong>{r.nombre}</strong>
              <small>
                {dmy(r.dia)} · {r.hora} · {r.tarifa}
              </small>
            </span>
            <span className={`${estilos.histEstado} ${estilos[`histEstado_${e}`] ?? ""}`}>{ETIQUETAS[e].replace(/s$/, "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
