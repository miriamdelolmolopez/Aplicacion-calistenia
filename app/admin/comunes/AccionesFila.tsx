"use client";

import { useState } from "react";
import estilos from "./comunes.module.css";
import { IconoCopiar, IconoEditar, IconoPapelera } from "./iconos";

// Lápiz (editar), copiar (duplicar) y papelera (eliminar) a un lado de cada fila.
// Duplicar y eliminar nunca se hacen de golpe: primero piden confirmar o cancelar.
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
  const [confirmando, setConfirmando] = useState<"duplicar" | "eliminar" | null>(null);

  if (confirmando) {
    const eliminar = confirmando === "eliminar";
    return (
      <div className={estilos.confirmar} role="group" aria-label={eliminar ? `Confirmar eliminar ${nombre}` : `Confirmar duplicar ${nombre}`}>
        <span>{eliminar ? "¿Eliminar?" : "¿Duplicar?"}</span>
        <button
          type="button"
          className={eliminar ? estilos.si : estilos.guardar}
          disabled={ocupado}
          onClick={() => {
            (eliminar ? alEliminar : alDuplicar)?.();
            setConfirmando(null);
          }}
        >
          {eliminar ? "Sí, eliminar" : "Sí, duplicar"}
        </button>
        <button type="button" onClick={() => setConfirmando(null)}>
          Cancelar
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
        <button type="button" className={estilos.icono} disabled={ocupado} onClick={() => setConfirmando("duplicar")} aria-label={`Duplicar ${nombre}`} title="Duplicar">
          <IconoCopiar />
        </button>
      )}
      {alEliminar && (
        <button type="button" className={`${estilos.icono} ${estilos.peligro}`} onClick={() => setConfirmando("eliminar")} aria-label={`Eliminar ${nombre}`} title="Eliminar">
          <IconoPapelera />
        </button>
      )}
    </div>
  );
}
