"use client";

import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { duplicarForma, eliminarForma } from "./acciones";
import { FormularioForma, type Forma } from "./Controles";

// Formas de pago: arriba «+ Nueva», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function ListaFormas({ formas }: { formas: Forma[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todas");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = formas.filter((f) => f.nombre.toLowerCase().includes(q) && (estadoFiltro === "todas" || (estadoFiltro === "activas" ? f.activa : !f.activa)));
  const abierta = formas.find((f) => f.clave === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva forma de pago" render={(cerrar) => <FormularioForma alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={estadoFiltro !== "todas" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar forma de pago…" />}>
        <div className={styles.campo}>
          <label htmlFor="ff-estado">Estado</label>
          <select id="ff-estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
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

      {visibles.length === 0 && <p className={comunes.sinResultados}>No hay formas de pago con ese filtro.</p>}
      {visibles.map((f) => (
        <div key={f.clave} className={comunes.fila}>
          <div>
            <strong>{f.nombre}</strong>
            <div className={styles.ayuda}>
              Orden {f.orden}
              {!f.activa && " · desactivada"}
            </div>
          </div>
          <AccionesFila
            nombre={f.nombre}
            ocupado={pendiente}
            alEditar={() => setEditando(f.clave)}
            alDuplicar={() => ejecutar(() => duplicarForma(f.clave))}
            alEliminar={() => ejecutar(() => eliminarForma(f.clave))}
          />
        </div>
      ))}

      {abierta && (
        <PanelCompleto titulo={`Editar ${abierta.nombre}`} cerrar={() => setEditando(null)}>
          <FormularioForma forma={abierta} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </div>
  );
}
