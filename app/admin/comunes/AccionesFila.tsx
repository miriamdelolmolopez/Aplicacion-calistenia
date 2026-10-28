"use client";

import { useState } from "react";
import estilos from "./comunes.module.css";
import { IconoCopiar, IconoEditar, IconoPapelera } from "./iconos";

// Lápiz (editar), copiar (duplicar) y papelera (eliminar, con confirmación), a un lado de cada fila.
export default function AccionesFila({
  nombre,
  alEditar,
  alDuplicar,
  alEliminar,
  ocupado = false,
}: {
  nombre: string;
  alEditar?: () => void;
  alDuplicar?: () => void;
  alEliminar?: () => void;
  ocupado?: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando && alEliminar) {
    return (
      <div className={estilos.confirmar}>
        <span>¿Eliminar?</span>
        <button
          type="button"
          className={estilos.si}
          disabled={ocupado}
          onClick={() => {
            alEliminar();
            setConfirmando(false);
          }}
        >
          Sí
        </button>
        <button type="button" onClick={() => setConfirmando(false)}>
          No
        </button>
      </div>
    );
  }

  return (
    <div className={estilos.acciones}>
      {alEditar && (
        <button type="button" className={estilos.icono} onClick={alEditar} aria-label={`Editar ${nombre}`} title="Editar">
          <IconoEditar />
        </button>
      )}
      {alDuplicar && (
        <button type="button" className={estilos.icono} disabled={ocupado} onClick={alDuplicar} aria-label={`Duplicar ${nombre}`} title="Duplicar">
          <IconoCopiar />
        </button>
      )}
      {alEliminar && (
        <button type="button" className={`${estilos.icono} ${estilos.peligro}`} onClick={() => setConfirmando(true)} aria-label={`Eliminar ${nombre}`} title="Eliminar">
          <IconoPapelera />
        </button>
      )}
    </div>
  );
}
