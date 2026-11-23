"use client";

import { useRef, useState } from "react";
import Asa from "./Asa";
import Chip from "./Chip";
import MenuOpcion from "./MenuOpcion";
import estilos from "./leads.module.css";
import type { TablaLista } from "./accionesCatalogos";
import type { ItemColor } from "./tipos";
import { useArrastre } from "./useArrastre";
import { useOpciones } from "./useOpciones";

// «Editar propiedad» (dentro del menú de una columna): la lista de opciones para arrastrar, añadir con el «+» y, pulsando una, cambiarle el nombre o el color o eliminarla.
export default function ContenidoEditor({ tabla, items }: { tabla: TablaLista; items: ItemColor[] }) {
  const op = useOpciones(tabla, items);
  const { propsFila, propsAsa, marcada } = useArrastre(op.mover);
  const [nuevo, setNuevo] = useState("");
  const [menu, setMenu] = useState<{ id: string; ancla: HTMLElement } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const abierta = op.items.find((x) => x.id === menu?.id);

  async function anadir() {
    const nombre = nuevo.trim();
    if (!nombre) return;
    if (await op.crear(nombre)) setNuevo("");
  }

  return (
    <>
      <div className={estilos.cabeceraSeccion}>
        <p className={estilos.tituloMenu}>Opciones</p>
        <button type="button" className={estilos.botonMas} onClick={() => entrada.current?.focus()} aria-label="Añadir una opción" title="Añadir una opción">
          +
        </button>
      </div>
      <ul className={estilos.filasEditor}>
        {op.items.length === 0 && <li className={estilos.vacioFiltro}>No hay ninguna todavía.</li>}
        {op.items.map((o, i) => (
          <li key={o.id} className={`${estilos.filaEditor} ${marcada(i) ? estilos.filaSobre : ""}`} {...propsFila(i)}>
            <Asa className={estilos.asa} {...propsAsa(i)} />
            <span className={estilos.chipFila}>
              <Chip item={o} />
            </span>
            <button type="button" className={estilos.flechaFila} aria-label={`Editar ${o.nombre}`} onClick={(e) => setMenu({ id: o.id, ancla: e.currentTarget })}>
              ›
            </button>
          </li>
        ))}
      </ul>
      <div className={estilos.filaNueva}>
        <input
          ref={entrada}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              anadir();
            }
          }}
          maxLength={40}
          placeholder="Escribe y pulsa Intro para añadir"
          aria-label="Nombre de la nueva opción"
        />
      </div>
      {op.error && <p className={estilos.errorMenu}>{op.error}</p>}
      {menu && abierta && (
        <MenuOpcion
          ancla={menu.ancla}
          item={abierta}
          alRenombrar={(nombre) => op.cambiar(abierta.id, { nombre })}
          alColorear={(color) => op.cambiar(abierta.id, { color })}
          alEliminar={() => op.eliminar(abierta.id)}
          alCerrar={() => setMenu(null)}
        />
      )}
    </>
  );
}
