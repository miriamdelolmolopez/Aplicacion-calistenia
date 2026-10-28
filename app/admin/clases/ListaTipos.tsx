"use client";

import { useState, useTransition, type ReactNode } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { colorDeTipo } from "@/lib/colores";
import { duplicarTipo, eliminarTipo } from "./acciones";
import { FormularioTipo, NuevoTipo } from "./Controles";

type Tipo = Parameters<typeof FormularioTipo>[0]["tipo"];

// Listado sencillo de tipos de clase. Arriba: buscar, filtrar y «+ Nuevo». Cada fila: editar, duplicar y eliminar.
export default function ListaTipos({ tipos, fotos }: { tipos: Tipo[]; fotos: Record<string, ReactNode> }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [busqueda, setBusqueda] = useState("");
  const [servicio, setServicio] = useState<"todos" | "grupal" | "individual">("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "desactivados">("todos");
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const visibles = tipos.filter(
    (t) =>
      t.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) &&
      (servicio === "todos" || t.servicio === servicio) &&
      (estadoFiltro === "todos" || (estadoFiltro === "activos" ? t.activo : !t.activo)),
  );
  const filtrosPuestos = (servicio !== "todos" ? 1 : 0) + (estadoFiltro !== "todos" ? 1 : 0);
  const abierto = tipos.find((t) => t.id === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nuevo tipo de clase" render={(cerrar) => <NuevoTipo alTerminar={cerrar} />} />
      </div>
      <PanelFiltros
        activos={filtrosPuestos}
        buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar clase…" />}
      >
        <div className={styles.campo}>
          <label htmlFor="ft-servicio">Tipo</label>
          <select id="ft-servicio" value={servicio} onChange={(e) => setServicio(e.target.value as typeof servicio)}>
            <option value="todos">Todos</option>
            <option value="grupal">Grupales</option>
            <option value="individual">Individuales</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="ft-estado">Estado</label>
          <select id="ft-estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}>
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="desactivados">Desactivados</option>
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

      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay clases con ese filtro.</p>}
      {visibles.map((t) => (
        <div key={t.id} className={comunes.fila}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", background: colorDeTipo(t.color, t.nombre), flex: "none" }} />
            <div>
              <strong>{t.nombre}</strong>
              <div className={styles.ayuda}>
                {t.servicio === "individual" ? "Individual" : "Grupal"} · {t.plazas_max} {t.plazas_max === 1 ? "plaza" : "plazas"} · {t.duracion_min} min
                {!t.activo && " · Desactivada"}
              </div>
            </div>
          </div>
          <AccionesFila
            nombre={t.nombre}
            ocupado={pendiente}
            alEditar={() => setEditando(t.id)}
            alDuplicar={() => ejecutar(() => duplicarTipo(t.id))}
            alEliminar={() => ejecutar(() => eliminarTipo(t.id))}
          />
        </div>
      ))}

      {abierto && (
        <PanelCompleto titulo={`Editar ${abierto.nombre}`} cerrar={() => setEditando(null)}>
          {fotos[abierto.id]}
          <FormularioTipo tipo={abierto} />
        </PanelCompleto>
      )}
    </div>
  );
}
