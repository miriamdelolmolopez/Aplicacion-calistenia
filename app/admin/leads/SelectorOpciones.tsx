"use client";

import { useState } from "react";
import Chip from "./Chip";
import ChipsConMas from "./ChipsConMas";
import Flotante from "./Flotante";
import { Flecha } from "./FiltroColumna";
import MenuOpcion from "./MenuOpcion";
import estilos from "./leads.module.css";
import type { TablaLista } from "./accionesCatalogos";
import { colorDe, PALETA, type ItemColor } from "./tipos";
import { useOpciones } from "./useOpciones";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Como en Notion: se pulsa el campo y se elige entre las opciones que ya hay o se escribe una nueva para crearla.
// Cada opción tiene sus «···» para cambiar el nombre, el color o eliminarla.
// Si lleva «nombreCampo», lo elegido viaja en el formulario con ese nombre. «alCambiar» avisa de cada elección.
export default function SelectorOpciones({
  tabla,
  opciones,
  multiple,
  valores,
  nombreCampo,
  alCambiar,
  variante = "campo",
  vacio = "Sin elegir",
}: {
  tabla: TablaLista;
  opciones: ItemColor[];
  multiple: boolean;
  valores: string[];
  nombreCampo?: string;
  alCambiar?: (ids: string[]) => void;
  variante?: "campo" | "pastilla";
  vacio?: string;
}) {
  const op = useOpciones(tabla, opciones);
  const [sel, setSel] = useState<string[]>(valores);
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [menu, setMenu] = useState<{ id: string; ancla: HTMLElement } | null>(null);
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null);

  const elegidas = sel.map((id) => op.items.find((x) => x.id === id)).filter((x): x is ItemColor => !!x);
  const q = sinTildes(texto);
  const filtradas = op.items.filter((o) => !q || sinTildes(o.nombre).includes(q));
  const hayExacta = op.items.some((o) => sinTildes(o.nombre) === q);
  const abierta = op.items.find((x) => x.id === menu?.id);
  const colorNuevo = PALETA[(op.items.length + 1) % PALETA.length].valor;

  function poner(ids: string[]) {
    setSel(ids);
    alCambiar?.(ids);
  }

  function elegir(id: string) {
    if (multiple) poner(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
    else {
      poner([id]);
      setAbierto(false);
    }
  }

  async function crear() {
    const nombre = texto.trim();
    if (!nombre) return;
    const item = await op.crear(nombre, colorNuevo);
    if (!item) return;
    setTexto("");
    elegir(item.id);
  }

  return (
    <>
      {nombreCampo && sel.filter((id) => op.items.some((x) => x.id === id)).map((id) => <input key={id} type="hidden" name={nombreCampo} value={id} />)}
      <button
        ref={setDisparador}
        type="button"
        className={variante === "pastilla" ? estilos.disparadorPastilla : estilos.disparadorCampo}
        style={variante === "pastilla" && elegidas[0] ? { color: colorDe(elegidas[0].color).fg, borderColor: colorDe(elegidas[0].color).fg } : undefined}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {variante === "pastilla" ? (
          <span>{elegidas[0]?.nombre ?? vacio}</span>
        ) : elegidas.length > 0 ? (
          <ChipsConMas items={elegidas} />
        ) : (
          <span className={estilos.marcador}>{vacio}</span>
        )}
        <Flecha tamano={16} />
      </button>

      {abierto && (
        <Flotante ancla={disparador} ancho={300} etiqueta="Elegir una opción" alCerrar={() => setAbierto(false)}>
          <div className={estilos.cabeceraOpciones}>
            {elegidas.map((e) => (
              <span key={e.id} className={estilos.elegidaConQuitar}>
                <Chip item={e} />
                <button type="button" aria-label={`Quitar ${e.nombre}`} onClick={() => poner(sel.filter((x) => x !== e.id))}>
                  ×
                </button>
              </span>
            ))}
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const exacta = op.items.find((o) => sinTildes(o.nombre) === q);
                if (exacta) elegir(exacta.id);
                else crear();
              }}
              maxLength={40}
              placeholder={elegidas.length > 0 ? "" : "Buscar o crear…"}
              aria-label="Buscar o crear"
            />
          </div>
          <p className={estilos.pista}>Selecciona una opción o crea una</p>
          <ul className={estilos.listaOpciones}>
            {filtradas.map((o) => (
              <li key={o.id} className={estilos.opcionFila}>
                <button type="button" className={estilos.opcionElegir} onClick={() => elegir(o.id)}>
                  <Chip item={o} />
                  {sel.includes(o.id) && <span className={estilos.visto}>✓</span>}
                </button>
                <button type="button" className={estilos.tresPuntos} aria-label={`Editar ${o.nombre}`} onClick={(e) => setMenu({ id: o.id, ancla: e.currentTarget })}>
                  ···
                </button>
              </li>
            ))}
            {texto.trim() && !hayExacta && (
              <li className={estilos.opcionFila}>
                <button type="button" className={estilos.opcionElegir} onClick={crear}>
                  <span>Crear</span>
                  <Chip item={{ nombre: texto.trim(), color: colorNuevo }} />
                </button>
              </li>
            )}
            {filtradas.length === 0 && !texto.trim() && <li className={estilos.vacioFiltro}>Todavía no hay ninguna. Escribe un nombre para crear la primera.</li>}
          </ul>
          {op.error && <p className={estilos.errorMenu}>{op.error}</p>}
          {menu && abierta && (
            <MenuOpcion
              ancla={menu.ancla}
              item={abierta}
              alRenombrar={(nombre) => op.cambiar(abierta.id, { nombre })}
              alColorear={(color) => op.cambiar(abierta.id, { color })}
              alEliminar={async () => {
                const ok = await op.eliminar(abierta.id);
                if (ok && sel.includes(abierta.id)) poner(sel.filter((x) => x !== abierta.id));
                return ok;
              }}
              alCerrar={() => setMenu(null)}
            />
          )}
        </Flotante>
      )}
    </>
  );
}
