"use client";

import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import { euros } from "@/lib/formato";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { desglose } from "../bonos/ListaPrecios";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { duplicarTarifa, eliminarTarifa } from "./acciones";
import FormularioTarifa, { SERVICIOS, type TipoBono } from "./FormularioTarifa";

const NOMBRE: Record<string, string> = Object.fromEntries(SERVICIOS.map((s) => [s.valor, s.texto]));

function validezTexto(dias: number): string {
  if (dias % 30 === 0) {
    const m = dias / 30;
    return `${dias} días (${m} ${m === 1 ? "mes" : "meses"})`;
  }
  return `${dias} días`;
}

// Resumen de lo que incluye, por ejemplo «4 créditos presencial grupal + Online 1:1».
function contenido(t: TipoBono): string {
  const parte = (n: number, s: string) => (s === "online" ? NOMBRE.online : `${n} ${n === 1 ? "crédito" : "créditos"} · ${NOMBRE[s] ?? s}`);
  return [parte(t.clases, t.servicio), t.servicio2 && t.clases2 ? parte(t.clases2, t.servicio2) : null].filter(Boolean).join(" + ");
}

const esSuelta = (t: TipoBono) => t.clases === 1 && t.servicio !== "online" && !t.servicio2;

// Lista de tarifas: arriba «+ Nueva», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function ListaTarifas({ tarifas }: { tarifas: TipoBono[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [servicio, setServicio] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todas");
  const [clase, setClase] = useState("todas");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = tarifas.filter(
    (t) =>
      t.nombre.toLowerCase().includes(q) &&
      (servicio === "todos" || t.servicio === servicio || t.servicio2 === servicio) &&
      (estadoFiltro === "todas" || (estadoFiltro === "activas" ? t.activo : !t.activo)) &&
      (clase === "todas" || (clase === "sueltas" ? esSuelta(t) : !esSuelta(t))),
  );
  const filtros = [servicio !== "todos", estadoFiltro !== "todas", clase !== "todas"].filter(Boolean).length;
  const abierta = tarifas.find((t) => t.id === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva tarifa" render={(cerrar) => <FormularioTarifa alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={filtros} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar tarifa…" />}>
        <div className={styles.campo}>
          <label htmlFor="ft-servicio">Servicio</label>
          <select id="ft-servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
            <option value="todos">Todos</option>
            {SERVICIOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.texto}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="ft-clase">Tipo</label>
          <select id="ft-clase" value={clase} onChange={(e) => setClase(e.target.value)}>
            <option value="todas">Bonos y clases sueltas</option>
            <option value="bonos">Solo bonos</option>
            <option value="sueltas">Solo clases sueltas</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="ft-estado">Estado</label>
          <select id="ft-estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="activas">Activas</option>
            <option value="desactivadas">Desactivadas</option>
          </select>
        </div>
      </PanelFiltros>

      {aviso.error && (
        <p className={styles.error} role="alert">
          {aviso.error}
        </p>
      )}
      {aviso.mensaje && (
        <p className={styles.aviso} role="status">
          {aviso.mensaje}
        </p>
      )}

      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay tarifas con ese filtro.</p>}
      {visibles.map((t) => {
        const d = desglose(t.precio_centimos, t.iva_porcentaje);
        return (
          <div key={t.id} className={comunes.fila}>
            <div>
              <strong>{t.nombre}</strong>
              <div className={styles.ayuda}>
                {contenido(t)} · caduca a los {validezTexto(t.validez_dias)}
                {t.servicio2 && t.validez_dias2 !== null && ` (el segundo, a los ${validezTexto(t.validez_dias2)})`}
                {!t.activo && " · desactivada"}
              </div>
              <div className={styles.ayuda}>
                <strong>{euros(t.precio_centimos)}</strong> · base {euros(d.base)} + IVA {t.iva_porcentaje} % ({euros(d.cuota)})
              </div>
            </div>
            <AccionesFila
              nombre={t.nombre}
              ocupado={pendiente}
              alEditar={() => setEditando(t.id)}
              alDuplicar={() => ejecutar(() => duplicarTarifa(t.id))}
              alEliminar={() => ejecutar(() => eliminarTarifa(t.id))}
            />
          </div>
        );
      })}

      {abierta && (
        <PanelCompleto titulo={`Editar ${abierta.nombre}`} cerrar={() => setEditando(null)}>
          <FormularioTarifa tarifa={abierta} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </div>
  );
}
