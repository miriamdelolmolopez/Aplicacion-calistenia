"use client";

import { useState, type ReactNode } from "react";
import ContenidoEditor from "./ContenidoEditor";
import Flotante from "./Flotante";
import estilos from "./leads.module.css";
import type { TablaLista } from "./accionesCatalogos";
import type { ItemColor } from "./tipos";

// Cómo se compara cada columna al filtrar (como en Notion: «es», «no es», «está vacío», «no está vacío»).
export type Operador = "es" | "no_es" | "vacio" | "no_vacio";
export const TEXTO_OPERADOR: Record<Operador, string> = { es: "es", no_es: "no es", vacio: "está vacío", no_vacio: "no está vacío" };
export type FiltroOpciones = { op: Operador; valores: string[] };
export type Sentido = "asc" | "desc";

type Vista = "raiz" | "editar" | "filtrar" | "ordenar";

// El menú que sale al pulsar el título de una columna. Arriba, el nombre de la propiedad (no se puede cambiar) con una «i» que explica qué es;
// después «Editar propiedad» (solo en las columnas con opciones), «Filtrar» y «Ordenar».
export default function MenuColumna({
  ancla,
  titulo,
  descripcion,
  edicion,
  filtro,
  filtroOpciones,
  filtroTexto,
  alFiltrarTexto,
  alFiltrarOpciones,
  contenidoFiltroFecha,
  sentido,
  alOrdenar,
  alCerrar,
}: {
  ancla: HTMLElement | null;
  titulo: string;
  descripcion: string;
  edicion?: { tabla: TablaLista; items: ItemColor[] };
  filtro: "opciones" | "texto" | "fecha";
  filtroOpciones?: { opciones: string[]; valor: FiltroOpciones | undefined };
  filtroTexto?: string;
  alFiltrarTexto?: (texto: string) => void;
  alFiltrarOpciones?: (f: FiltroOpciones | undefined) => void;
  contenidoFiltroFecha?: ReactNode;
  sentido: Sentido | null;
  alOrdenar: (s: Sentido) => void;
  alCerrar: () => void;
}) {
  const [vista, setVista] = useState<Vista>("raiz");

  const actual = filtroOpciones?.valor ?? { op: "es" as Operador, valores: [] };
  const filtrando = filtro === "opciones" ? !!filtroOpciones?.valor && (["vacio", "no_vacio"].includes(actual.op) || actual.valores.length > 0) : filtro === "texto" ? !!filtroTexto : false;

  const atras = (texto: string) => (
    <button type="button" className={estilos.atrasMenu} onClick={() => setVista("raiz")}>
      ‹ {texto}
    </button>
  );

  return (
    <Flotante ancla={ancla} ancho={300} etiqueta={`Opciones de la columna ${titulo}`} alCerrar={alCerrar}>
      {vista === "raiz" && (
        <>
          <div className={estilos.nombrePropiedad}>
            <span className={estilos.tituloPropiedad}>{titulo}</span>
            <span className={estilos.infoContenedor}>
              <button type="button" className={estilos.botonInfo} aria-label={`¿Qué es esta columna? ${descripcion}`}>
                i
              </button>
              <span className={estilos.infoGlobo} role="tooltip">
                {descripcion}
              </span>
            </span>
          </div>
          {edicion && (
            <button type="button" className={estilos.accionMenu} onClick={() => setVista("editar")}>
              <span>Editar propiedad</span>
              <span className={estilos.visto}>›</span>
            </button>
          )}
          <button type="button" className={estilos.accionMenu} onClick={() => setVista("filtrar")}>
            <span>Filtrar{filtrando ? " (activo)" : ""}</span>
            <span className={estilos.visto}>›</span>
          </button>
          <button type="button" className={estilos.accionMenu} onClick={() => setVista("ordenar")}>
            <span>Ordenar{sentido ? (sentido === "asc" ? " (ascendente)" : " (descendente)") : ""}</span>
            <span className={estilos.visto}>›</span>
          </button>
        </>
      )}

      {vista === "editar" && edicion && (
        <>
          {atras("Editar propiedad")}
          <ContenidoEditor tabla={edicion.tabla} items={edicion.items} />
        </>
      )}

      {vista === "ordenar" && (
        <>
          {atras("Ordenar")}
          <button type="button" className={estilos.accionMenu} onClick={() => alOrdenar("asc")}>
            <span>Ordenar de forma ascendente</span>
            {sentido === "asc" && <span className={estilos.visto}>✓</span>}
          </button>
          <button type="button" className={estilos.accionMenu} onClick={() => alOrdenar("desc")}>
            <span>Ordenar de forma descendente</span>
            {sentido === "desc" && <span className={estilos.visto}>✓</span>}
          </button>
        </>
      )}

      {vista === "filtrar" && (
        <>
          {atras("Filtrar")}
          {filtro === "opciones" && filtroOpciones && alFiltrarOpciones && (
            <>
              <label className={estilos.operador}>
                <span>{titulo}</span>
                <select value={actual.op} onChange={(e) => alFiltrarOpciones({ op: e.target.value as Operador, valores: actual.valores })} aria-label="Cómo comparar">
                  {(Object.keys(TEXTO_OPERADOR) as Operador[]).map((o) => (
                    <option key={o} value={o}>
                      {TEXTO_OPERADOR[o]}
                    </option>
                  ))}
                </select>
              </label>
              {(actual.op === "es" || actual.op === "no_es") && (
                <ul className={estilos.opciones}>
                  {filtroOpciones.opciones.length === 0 && <li className={estilos.vacioFiltro}>Todavía no hay opciones.</li>}
                  {filtroOpciones.opciones.map((o) => (
                    <li key={o}>
                      <label>
                        <input
                          type="checkbox"
                          checked={actual.valores.includes(o)}
                          onChange={() => alFiltrarOpciones({ op: actual.op, valores: actual.valores.includes(o) ? actual.valores.filter((v) => v !== o) : [...actual.valores, o] })}
                        />
                        <span>{o}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {filtroOpciones.valor && (
                <button type="button" className={estilos.limpiar} onClick={() => alFiltrarOpciones(undefined)}>
                  Quitar filtro
                </button>
              )}
            </>
          )}
          {filtro === "texto" && alFiltrarTexto && (
            <>
              <label className={estilos.operador}>
                <span>{titulo} contiene</span>
              </label>
              <input className={estilos.campoFiltro} value={filtroTexto ?? ""} onChange={(e) => alFiltrarTexto(e.target.value)} placeholder="Escribe para filtrar…" aria-label={`Filtrar ${titulo}`} autoFocus />
              {filtroTexto && (
                <button type="button" className={estilos.limpiar} onClick={() => alFiltrarTexto("")}>
                  Quitar filtro
                </button>
              )}
            </>
          )}
          {filtro === "fecha" && contenidoFiltroFecha}
        </>
      )}
    </Flotante>
  );
}
