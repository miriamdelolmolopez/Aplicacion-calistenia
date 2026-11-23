"use client";

import { useRef } from "react";
import Icono from "../../Icono";
import Flotante from "./Flotante";
import estilos from "./leads.module.css";
import { colorDe, esHex, hexDe, PALETA, type ItemColor } from "./tipos";

// El menú de una opción (los «···»): cambiar el nombre, eliminarla y elegir su color (los de siempre o uno propio).
export default function MenuOpcion({
  ancla,
  item,
  alRenombrar,
  alColorear,
  alEliminar,
  alCerrar,
}: {
  ancla: HTMLElement | null;
  item: ItemColor;
  alRenombrar: (nombre: string) => void;
  alColorear: (color: string) => void;
  alEliminar: () => Promise<boolean>;
  alCerrar: () => void;
}) {
  const nombre = useRef(item.nombre);
  const cerrarGuardando = () => {
    const limpio = nombre.current.trim();
    if (limpio && limpio !== item.nombre) alRenombrar(limpio);
    alCerrar();
  };
  const esPropio = esHex(item.color) && !PALETA.some((p) => p.valor === item.color);

  return (
    <Flotante ancla={ancla} ancho={240} lado="derecha" etiqueta={`Editar ${item.nombre}`} alCerrar={cerrarGuardando}>
      <input
        className={estilos.nombreOpcion}
        defaultValue={item.nombre}
        autoFocus
        maxLength={40}
        aria-label="Nombre"
        onChange={(e) => {
          nombre.current = e.target.value;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            cerrarGuardando();
          }
        }}
      />
      <button
        type="button"
        className={estilos.accionMenu}
        onClick={async () => {
          if (await alEliminar()) alCerrar();
        }}
      >
        <Icono nombre="papelera" tamano={16} /> Eliminar
      </button>
      <p className={estilos.tituloMenu}>Colores</p>
      <ul className={estilos.listaColores}>
        {PALETA.map((p) => (
          <li key={p.valor}>
            <button type="button" className={estilos.filaColorPaleta} onClick={() => alColorear(p.valor)}>
              <span className={estilos.cuadrito} style={{ background: colorDe(p.valor).bg, borderColor: colorDe(p.valor).fg }} />
              <span>{p.texto}</span>
              {item.color === p.valor && <span className={estilos.visto}>✓</span>}
            </button>
          </li>
        ))}
        <li>
          <label className={estilos.filaColorPaleta}>
            <span className={`${estilos.cuadrito} ${estilos.muestraPropia}`} style={{ background: esPropio ? item.color : undefined }}>
              <input type="color" value={hexDe(item.color)} onChange={(e) => alColorear(e.target.value)} aria-label="Elegir otro color" />
            </span>
            <span>Personalizado…</span>
            {esPropio && <span className={estilos.visto}>✓</span>}
          </label>
        </li>
      </ul>
    </Flotante>
  );
}
