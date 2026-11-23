"use client";

import { useState, type ReactNode } from "react";
import Chip from "./Chip";
import estilos from "./leads.module.css";
import type { ItemColor } from "./tipos";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ALTO_FILA = 34;

// Una lista de opciones con barra para bajar (se ven «filas» a la vez) y, si se pide, un buscador arriba.
// Con «marcadas» se pueden elegir varias (sale un ✓ en las elegidas); sin ellas, al pulsar una se elige esa y ya.
// Con «alCrear», si lo que se escribe en el buscador no existe, aparece «Crear …» (y también se crea con Intro).
export default function ListaBuscable({
  items,
  filas,
  buscador,
  marcadas,
  alElegir,
  alCrear,
  final,
}: {
  items: ItemColor[];
  filas: number;
  buscador: boolean;
  marcadas?: string[];
  alElegir: (item: ItemColor) => void;
  alCrear?: (nombre: string) => void;
  final?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const q = sinTildes(texto);
  const visibles = items.filter((i) => !q || sinTildes(i.nombre).includes(q));
  const exacta = items.find((i) => sinTildes(i.nombre) === q);
  const puedeCrear = !!alCrear && !!texto.trim() && !exacta;

  function crear() {
    if (!alCrear || !texto.trim()) return;
    alCrear(texto.trim().slice(0, 40));
    setTexto("");
  }

  return (
    <>
      {buscador && (
        <input
          className={estilos.buscadorLista}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (exacta) alElegir(exacta);
            else crear();
          }}
          placeholder={alCrear ? "Buscar o crear…" : "Buscar…"}
          aria-label="Buscar en la lista"
          autoFocus
        />
      )}
      <ul className={estilos.listaDesplazable} style={{ maxHeight: filas * ALTO_FILA }}>
        {visibles.length === 0 && !puedeCrear && <li className={estilos.vacioFiltro}>No hay resultados.</li>}
        {visibles.map((i) => (
          <li key={i.id} className={estilos.opcionFila}>
            <button type="button" className={estilos.opcionElegir} onClick={() => alElegir(i)}>
              <Chip item={i} />
              {marcadas?.includes(i.id) && <span className={estilos.visto}>✓</span>}
            </button>
          </li>
        ))}
        {puedeCrear && (
          <li className={estilos.opcionFila}>
            <button type="button" className={estilos.opcionElegir} onClick={crear}>
              <span>Crear</span>
              <Chip item={{ nombre: texto.trim(), color: "azul" }} />
            </button>
          </li>
        )}
        {final}
      </ul>
    </>
  );
}
