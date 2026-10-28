"use client";

import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import { ESTADOS_CURSO, NIVELES, nombreNivel, textoPrecio, type Curso } from "@/lib/cursos";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { duplicarCurso, eliminarCurso } from "./acciones";
import { FormularioCurso } from "./Controles";

const etiquetaEstado = (e: string) => ESTADOS_CURSO.find((x) => x.valor === e)?.es.split(" (")[0] ?? e;

// Lista de cursos: arriba «+ Nuevo», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function ListaCursos({ cursos, categorias }: { cursos: Curso[]; categorias: string[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [nivel, setNivel] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = cursos.filter(
    (c) =>
      c.titulo.toLowerCase().includes(q) &&
      (estado === "todos" || c.estado === estado) &&
      (nivel === "todos" || c.nivel === nivel) &&
      (categoria === "todas" || c.categoria === categoria),
  );
  const filtros = [estado !== "todos", nivel !== "todos", categoria !== "todas"].filter(Boolean).length;
  const abierto = cursos.find((c) => c.id === editando);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nuevo" titulo="Nuevo curso" render={(cerrar) => <FormularioCurso categorias={categorias} alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={filtros} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar curso…" />}>
        <div className={styles.campo}>
          <label htmlFor="fc-estado">Estado</label>
          <select id="fc-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            {ESTADOS_CURSO.map((e) => (
              <option key={e.valor} value={e.valor}>
                {etiquetaEstado(e.valor)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="fc-nivel">Nivel</label>
          <select id="fc-nivel" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="todos">Todos</option>
            {NIVELES.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.es}
              </option>
            ))}
          </select>
        </div>
        {categorias.length > 0 && (
          <div className={styles.campo}>
            <label htmlFor="fc-categoria">Categoría</label>
            <select id="fc-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <p className={comunes.sinResultados}>{cursos.length === 0 ? "Todavía no hay cursos." : "No hay cursos con ese filtro."}</p>
      )}
      {visibles.map((c) => (
        <div key={c.id} className={comunes.fila}>
          <div>
            <strong>{c.titulo}</strong>
            <div className={styles.ayuda}>
              {etiquetaEstado(c.estado)} · {nombreNivel(c.nivel, "es")} · {textoPrecio(c.precio_centimos, "es")}
              {c.categoria && ` · ${c.categoria}`}
            </div>
          </div>
          <AccionesFila
            nombre={c.titulo}
            ocupado={pendiente}
            alEditar={() => setEditando(c.id)}
            alDuplicar={() => ejecutar(() => duplicarCurso(c.id))}
            alEliminar={() => ejecutar(() => eliminarCurso(c.id))}
          />
        </div>
      ))}

      {abierto && (
        <PanelCompleto titulo={`Editar ${abierto.titulo}`} cerrar={() => setEditando(null)}>
          <FormularioCurso curso={abierto} categorias={categorias} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </div>
  );
}
