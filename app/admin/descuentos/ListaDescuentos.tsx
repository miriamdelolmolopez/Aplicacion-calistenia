"use client";

import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import { euros } from "@/lib/formato";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { duplicarDescuento, eliminarDescuento } from "./acciones";
import FormularioDescuento, { type DescuentoDatos } from "./FormularioDescuento";

export type FilaDescuento = DescuentoDatos & { usos: number; situacion: "disponible" | "desactivado" | "caducado" | "agotado" };

const SITUACION: Record<FilaDescuento["situacion"], string> = {
  disponible: "Disponible",
  desactivado: "Desactivado",
  caducado: "Caducado",
  agotado: "Agotado",
};

function fecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

// Lista de descuentos: arriba «+ Nuevo», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function ListaDescuentos({ descuentos }: { descuentos: FilaDescuento[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [situacion, setSituacion] = useState("todas");
  const [tipo, setTipo] = useState("todos");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = descuentos.filter(
    (d) => d.nombre.toLowerCase().includes(q) && (situacion === "todas" || d.situacion === situacion) && (tipo === "todos" || d.tipo === tipo),
  );
  const filtros = [situacion !== "todas", tipo !== "todos"].filter(Boolean).length;
  const abierto = descuentos.find((d) => d.id === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nuevo" titulo="Nuevo descuento" render={(cerrar) => <FormularioDescuento alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={filtros} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar descuento…" />}>
        <div className={styles.campo}>
          <label htmlFor="fd-situacion">Situación</label>
          <select id="fd-situacion" value={situacion} onChange={(e) => setSituacion(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="disponible">Disponibles</option>
            <option value="desactivado">Desactivados</option>
            <option value="caducado">Caducados</option>
            <option value="agotado">Agotados</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="fd-tipo">Tipo</label>
          <select id="fd-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="euros">Importe fijo (€)</option>
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

      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay descuentos con ese filtro.</p>}
      {visibles.map((d) => (
        <div key={d.id} className={comunes.fila}>
          <div>
            <strong>{d.nombre}</strong>
            <div className={styles.ayuda}>
              {d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}
              {d.caduca_en && ` · caduca ${fecha(d.caduca_en)}`}
              {` · usado ${d.usos}${d.usos_max !== null ? ` de ${d.usos_max}` : ""} ${d.usos === 1 ? "vez" : "veces"}`}
            </div>
            <span className={d.situacion === "disponible" ? styles.etiquetaSuave : styles.etiqueta}>{SITUACION[d.situacion]}</span>
          </div>
          <AccionesFila
            nombre={d.nombre}
            ocupado={pendiente}
            alEditar={() => setEditando(d.id)}
            alDuplicar={() => ejecutar(() => duplicarDescuento(d.id))}
            alEliminar={() => ejecutar(() => eliminarDescuento(d.id))}
          />
        </div>
      ))}

      {abierto && (
        <PanelCompleto titulo={`Editar ${abierto.nombre}`} cerrar={() => setEditando(null)}>
          <FormularioDescuento descuento={abierto} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </div>
  );
}
