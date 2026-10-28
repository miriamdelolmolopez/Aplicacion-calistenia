"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { useEnvio } from "../useEnvio";
import { crearMaterial, duplicarMaterial, editarMaterial, eliminarMaterial } from "./acciones";

export type MaterialFila = { id: string; nombre: string; nombre_en: string | null; activo: boolean; usos: number };

// Crear (sin material) o editar (con material).
function FormularioMaterialCompleto({ material, alTerminar }: { material?: MaterialFila; alTerminar: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(material ? editarMaterial : crearMaterial, {});
  const p = material?.id ?? "nuevo";
  const { ref, alEnviar } = useEnvio(accion, estado, !material);

  useEffect(() => {
    if (!estado.mensaje) return;
    const t = setTimeout(alTerminar, 800);
    return () => clearTimeout(t);
  }, [estado, alTerminar]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      {material && <input type="hidden" name="id" value={material.id} />}
      <div className={styles.campo}>
        <label htmlFor={`mn-${p}`}>Nombre</label>
        <input id={`mn-${p}`} name="nombre" required maxLength={60} defaultValue={material?.nombre ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`me-${p}`}>Nombre en inglés (opcional)</label>
        <input id={`me-${p}`} name="nombre_en" maxLength={60} defaultValue={material?.nombre_en ?? ""} />
      </div>
      {material && (
        <label className={styles.casilla}>
          <input type="checkbox" name="activo" defaultChecked={material.activo} />
          Visible al elegir material (si lo quitas, no sale en la lista, pero se conserva en los ejercicios)
        </label>
      )}
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : material ? "Guardar cambios" : "Añadir material"}
      </button>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

// Pestaña «Material»: arriba «+ Nuevo», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function GestionMaterial({ materiales }: { materiales: MaterialFila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [visibilidad, setVisibilidad] = useState("todos");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = materiales.filter((m) => m.nombre.toLowerCase().includes(q) && (visibilidad === "todos" || (visibilidad === "visibles" ? m.activo : !m.activo)));
  const abierto = materiales.find((m) => m.id === editando);

  return (
    <section className={styles.tarjeta}>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nuevo" titulo="Nuevo material" render={(cerrar) => <FormularioMaterialCompleto alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={visibilidad !== "todos" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar material…" />}>
        <div className={styles.campo}>
          <label htmlFor="gm-vis">Visibilidad</label>
          <select id="gm-vis" value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="visibles">Visibles</option>
            <option value="ocultos">Ocultos</option>
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

      {visibles.length === 0 && <p className={comunes.sinResultados}>{materiales.length === 0 ? "Todavía no hay material." : "No hay material con ese filtro."}</p>}
      {visibles.map((m) => (
        <div key={m.id} className={comunes.fila}>
          <div>
            <strong>{m.nombre}</strong>
            <div className={styles.ayuda}>
              En {m.usos} {m.usos === 1 ? "ejercicio" : "ejercicios"}
              {!m.activo && " · oculto"}
            </div>
          </div>
          <AccionesFila
            nombre={m.nombre}
            ocupado={pendiente}
            alEditar={() => setEditando(m.id)}
            alDuplicar={() => ejecutar(() => duplicarMaterial(m.id))}
            alEliminar={() => ejecutar(() => eliminarMaterial(m.id))}
          />
        </div>
      ))}

      {abierto && (
        <PanelCompleto titulo={`Editar ${abierto.nombre}`} cerrar={() => setEditando(null)}>
          <FormularioMaterialCompleto material={abierto} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </section>
  );
}
