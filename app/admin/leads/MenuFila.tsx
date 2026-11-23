"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Icono from "../../Icono";
import Flotante from "./Flotante";
import estilos from "./leads.module.css";
import { eliminarLead } from "./acciones";

// Los tres puntitos del final de cada fila de la lista: Editar (abre la ficha) y Eliminar (con confirmación).
export default function MenuFila({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();
  const [boton, setBoton] = useState<HTMLButtonElement | null>(null);

  function eliminar() {
    if (!window.confirm(`¿Eliminar a ${nombre || "este lead"}? Se borrará con sus notas y no se puede deshacer.`)) return;
    setError("");
    empezar(async () => {
      const r = await eliminarLead(id);
      if (!r.ok) {
        setError(r.error ?? "No se ha podido eliminar.");
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <>
      <button ref={setBoton} type="button" className={estilos.tresPuntosFila} aria-label={`Opciones de ${nombre}`} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {abierto && (
        <Flotante ancla={boton} ancho={170} etiqueta={`Opciones de ${nombre}`} alCerrar={() => setAbierto(false)}>
          <Link href={`/admin/leads/${id}`} className={estilos.accionMenu}>
            <Icono nombre="editar" tamano={16} /> Editar
          </Link>
          <button type="button" className={`${estilos.accionMenu} ${estilos.accionPeligro}`} onClick={eliminar} disabled={pendiente}>
            <Icono nombre="papelera" tamano={16} /> {pendiente ? "Eliminando…" : "Eliminar"}
          </button>
          {error && <p className={estilos.errorMenu}>{error}</p>}
        </Flotante>
      )}
    </>
  );
}
