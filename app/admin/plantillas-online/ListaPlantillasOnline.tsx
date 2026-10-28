"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import { duplicarRutinaLista, eliminarRutinaLista } from "../rutinas/acciones";
import NuevaPlantillaOnline from "./NuevaPlantillaOnline";

export type FilaPlantilla = { id: string; nombre: string; estado: string; resumen: string };

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  publicada: { texto: "Publicada", clase: "estadoPublicada" },
  borrador: { texto: "Borrador", clase: "estadoBorrador" },
  historial: { texto: "Historial", clase: "estadoHistorial" },
};

// Plantillas online: arriba «+ Nueva», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function ListaPlantillasOnline({ plantillas }: { plantillas: FilaPlantilla[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => {
      const r = await accion();
      setAviso(r);
      if (!r.error) router.refresh();
    });
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = plantillas.filter((p) => p.nombre.toLowerCase().includes(q) && (estado === "todos" || p.estado === estado));

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva plantilla online" render={() => <NuevaPlantillaOnline plantillas={plantillas.map((p) => ({ id: p.id, nombre: p.nombre }))} />} />
      </div>
      <PanelFiltros activos={estado !== "todos" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar plantilla…" />}>
        <div className={styles.campo}>
          <label htmlFor="fpo-estado">Estado</label>
          <select id="fpo-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="publicada">Publicadas</option>
            <option value="borrador">Borradores</option>
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

      {visibles.length === 0 && (
        <p className={comunes.sinResultados}>{plantillas.length === 0 ? "Todavía no hay plantillas. Crea una con «+ Nueva»." : "No hay plantillas con ese filtro."}</p>
      )}
      {visibles.map((p) => (
        <div key={p.id} className={comunes.fila}>
          <div>
            <strong>{p.nombre}</strong>
            <div className={styles.ayuda}>{p.resumen}</div>
            <span className={`${styles.estadoChip} ${styles[ESTADOS[p.estado]?.clase ?? "estadoBorrador"]}`}>{ESTADOS[p.estado]?.texto ?? p.estado}</span>
          </div>
          <AccionesFila
            nombre={p.nombre}
            ocupado={pendiente}
            alEditar={() => router.push(`/admin/rutinas/${p.id}`)}
            alDuplicar={() => ejecutar(() => duplicarRutinaLista(p.id))}
            alEliminar={() => ejecutar(() => eliminarRutinaLista(p.id))}
          />
        </div>
      ))}
    </div>
  );
}
