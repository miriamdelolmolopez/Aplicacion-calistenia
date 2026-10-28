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
import { duplicarContenido, eliminarContenido } from "./acciones";
import { FormularioPregunta, FormularioSeccion, FormularioTermino, type Pregunta, type Seccion, type Termino } from "./Controles";

type Tabla = "glosario" | "historia" | "preguntas";
type Elemento = { id: string; titulo: string; detalle?: string; visible: boolean };

// Lista sencilla con «+ Nuevo», buscar y filtrar por visibilidad. Cada fila: editar, duplicar y eliminar.
function Lista({
  tabla,
  elementos,
  etiquetaNuevo,
  tituloNuevo,
  buscar,
  vacio,
  formulario,
}: {
  tabla: Tabla;
  elementos: Elemento[];
  etiquetaNuevo: string;
  tituloNuevo: string;
  buscar: string;
  vacio: string;
  formulario: (id: string | null, cerrar: () => void) => ReactNode;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [visibilidad, setVisibilidad] = useState("todos");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = elementos.filter(
    (e) => e.titulo.toLowerCase().includes(q) && (visibilidad === "todos" || (visibilidad === "visibles" ? e.visible : !e.visible)),
  );
  const abierto = elementos.find((e) => e.id === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta={etiquetaNuevo} titulo={tituloNuevo} render={(cerrar) => formulario(null, cerrar)} />
      </div>
      <PanelFiltros activos={visibilidad !== "todos" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder={buscar} />}>
        <div className={styles.campo}>
          <label htmlFor={`la-${tabla}`}>Visibilidad</label>
          <select id={`la-${tabla}`} value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="visibles">Visibles para las alumnas</option>
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

      {visibles.length === 0 && <p className={comunes.sinResultados}>{elementos.length === 0 ? vacio : "No hay nada con ese filtro."}</p>}
      {visibles.map((e) => (
        <div key={e.id} className={comunes.fila}>
          <div>
            <strong>{e.titulo}</strong>
            <div className={styles.ayuda}>
              {e.detalle && `${e.detalle} · `}
              {e.visible ? "Visible" : "Oculto"}
            </div>
          </div>
          <AccionesFila
            nombre={e.titulo}
            ocupado={pendiente}
            alEditar={() => setEditando(e.id)}
            alDuplicar={() => ejecutar(() => duplicarContenido(tabla, e.id))}
            alEliminar={() => ejecutar(() => eliminarContenido(tabla, e.id))}
          />
        </div>
      ))}

      {abierto && (
        <PanelCompleto titulo={`Editar ${abierto.titulo.slice(0, 40)}`} cerrar={() => setEditando(null)}>
          {formulario(abierto.id, () => setEditando(null))}
        </PanelCompleto>
      )}
    </div>
  );
}

export function ListaGlosario({ terminos, fotos }: { terminos: Termino[]; fotos: Record<string, ReactNode> }) {
  return (
    <Lista
      tabla="glosario"
      elementos={terminos.map((t) => ({ id: t.id, titulo: t.termino_es, visible: t.activo }))}
      etiquetaNuevo="Nuevo"
      tituloNuevo="Nuevo término"
      buscar="Buscar término…"
      vacio="Todavía no hay términos."
      formulario={(id, cerrar) => {
        const t = id ? terminos.find((x) => x.id === id) : undefined;
        return (
          <>
            {t && fotos[t.id]}
            <FormularioTermino termino={t} alTerminar={cerrar} />
          </>
        );
      }}
    />
  );
}

export function ListaHistoria({ secciones, fotos, siguienteOrden }: { secciones: Seccion[]; fotos: Record<string, ReactNode>; siguienteOrden: number }) {
  return (
    <Lista
      tabla="historia"
      elementos={secciones.map((s) => ({ id: s.id, titulo: s.titulo_es, detalle: `Orden ${s.orden}`, visible: s.activo }))}
      etiquetaNuevo="Nuevo"
      tituloNuevo="Nuevo apartado"
      buscar="Buscar apartado…"
      vacio="Todavía no hay apartados."
      formulario={(id, cerrar) => {
        const s = id ? secciones.find((x) => x.id === id) : undefined;
        return (
          <>
            {s && fotos[s.id]}
            <FormularioSeccion seccion={s} siguienteOrden={siguienteOrden} alTerminar={cerrar} />
          </>
        );
      }}
    />
  );
}

export function ListaPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  return (
    <Lista
      tabla="preguntas"
      elementos={preguntas.map((p) => ({ id: p.id, titulo: p.pregunta_es, visible: p.activa }))}
      etiquetaNuevo="Nueva"
      tituloNuevo="Nueva pregunta"
      buscar="Buscar pregunta…"
      vacio="Todavía no hay preguntas."
      formulario={(id, cerrar) => <FormularioPregunta pregunta={id ? preguntas.find((x) => x.id === id) : undefined} alTerminar={cerrar} />}
    />
  );
}
