"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import { borrarPlantilla, duplicarPlantilla, guardarPlantilla } from "./acciones";
import { NuevaPlantilla } from "./Controles";

export type ResumenPlantilla = { id: string; nombre: string; clases: number; usada: boolean; principal: boolean; orden: number; activa: boolean; puedeBorrar: boolean };

// Una plantilla: cabecera con sus iconos (editar abre y cierra su contenido, duplicar, eliminar) y, debajo, lo que se edita.
function Tarjeta({ plantilla, contenido }: { plantilla: ResumenPlantilla; contenido: ReactNode }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [orden, setOrden] = useState(String(plantilla.orden));
  const [activa, setActiva] = useState(plantilla.activa);
  const cambiado = nombre !== plantilla.nombre || Number(orden) !== plantilla.orden || activa !== plantilla.activa;

  function guardar() {
    empezar(async () => {
      const r = await guardarPlantilla(plantilla.id, { nombre, orden: Number(orden), activa });
      setAviso(r);
      if (!r.error) router.refresh();
    });
  }

  function descartar() {
    setNombre(plantilla.nombre);
    setOrden(String(plantilla.orden));
    setActiva(plantilla.activa);
    setAviso({});
  }

  function ejecutar(accion: (previo: Estado, datos: FormData) => Promise<Estado>) {
    const datos = new FormData();
    datos.set("id", plantilla.id);
    empezar(async () => {
      const r = await accion({}, datos);
      setAviso(r);
      if (!r.error) router.refresh();
    });
  }

  return (
    <section className={styles.tarjeta}>
      <div className={comunes.fila} style={{ boxShadow: "none", padding: 0, margin: 0 }}>
        <div>
          {abierta ? (
            <input aria-label="Nombre de la plantilla" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} style={{ fontWeight: 700, minWidth: 200, padding: "6px 10px", border: "1px solid var(--linea)", borderRadius: 10 }} />
          ) : (
            <strong>{plantilla.nombre}</strong>
          )}
          <div className={styles.ayuda}>
            {plantilla.clases} {plantilla.clases === 1 ? "clase" : "clases"} por semana
            {plantilla.principal && " · principal"}
            {plantilla.usada && " · usada ahora"}
            {!plantilla.activa && " · desactivada"}
          </div>
        </div>
        <AccionesFila
          nombre={plantilla.nombre}
          ocupado={pendiente}
          alEditar={() => setAbierta((a) => !a)}
          alDuplicar={() => ejecutar(duplicarPlantilla)}
          alEliminar={plantilla.puedeBorrar ? () => ejecutar(borrarPlantilla) : undefined}
        />
      </div>
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
      {abierta && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={styles.formularioInterno}>
            <div className={styles.campo}>
              <label htmlFor={`orden-${plantilla.id}`}>Orden de aparición</label>
              <input id={`orden-${plantilla.id}`} type="number" min={0} max={9999} value={orden} onChange={(e) => setOrden(e.target.value)} />
            </div>
            <label className={styles.casilla}>
              <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
              Activa (si la desactivas, queda guardada pero no sale al elegir plantilla para publicar)
            </label>
            {cambiado && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className={styles.boton} disabled={pendiente} onClick={guardar}>
                  {pendiente ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente} onClick={descartar}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
          {contenido}
        </div>
      )}
    </section>
  );
}

// Plantillas: arriba «+ Nueva», buscar y filtrar. Cada plantilla: editar, duplicar y eliminar.
export default function ListaPlantillas({ plantillas, contenidos }: { plantillas: ResumenPlantilla[]; contenidos: Record<string, ReactNode> }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");

  const q = busqueda.trim().toLowerCase();
  const visibles = plantillas.filter((p) => p.nombre.toLowerCase().includes(q) && (filtro === "todas" || (filtro === "usada" ? p.usada : p.principal)));

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva plantilla" render={(cerrar) => <NuevaPlantilla alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={filtro !== "todas" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar plantilla…" />}>
        <div className={styles.campo}>
          <label htmlFor="fpl-filtro">Mostrar</label>
          <select id="fpl-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="usada">La usada ahora</option>
            <option value="principal">La principal</option>
          </select>
        </div>
      </PanelFiltros>

      {visibles.length === 0 && <p className={comunes.sinResultados}>{plantillas.length === 0 ? "Todavía no hay plantillas." : "No hay plantillas con ese filtro."}</p>}
      {visibles.map((p) => (
        <Tarjeta key={p.id} plantilla={p} contenido={contenidos[p.id]} />
      ))}
    </div>
  );
}
