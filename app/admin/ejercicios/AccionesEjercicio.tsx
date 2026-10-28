"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import PanelCompleto from "../comunes/PanelCompleto";
import { duplicarEjercicio, eliminarEjercicio } from "./acciones";

// Lápiz (abre la pantalla de edición), copiar y papelera de un ejercicio.
export default function AccionesEjercicio({ id, nombre, editor }: { id: string; nombre: string; editor: ReactNode }) {
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => setAviso(await accion()));
  }

  return (
    <div>
      <AccionesFila
        nombre={nombre}
        ocupado={pendiente}
        alEditar={() => setEditando(true)}
        alDuplicar={() => ejecutar(() => duplicarEjercicio(id))}
        alEliminar={() => ejecutar(() => eliminarEjercicio(id))}
      />
      {aviso.error && (
        <p className={styles.error} role="alert" style={{ maxWidth: 260 }}>
          {aviso.error}
        </p>
      )}
      {aviso.mensaje && (
        <p className={styles.aviso} role="status" style={{ maxWidth: 260 }}>
          {aviso.mensaje}
        </p>
      )}
      {editando && (
        <PanelCompleto titulo={`Editar ${nombre}`} cerrar={() => setEditando(false)}>
          {editor}
        </PanelCompleto>
      )}
    </div>
  );
}
