"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { colorDeTipo } from "@/lib/colores";
import { duplicarTipo, eliminarTipo } from "./acciones";
import { FormularioTipo } from "./Controles";

type Tipo = Parameters<typeof FormularioTipo>[0]["tipo"];

// Un listado sencillo: cada clase en una fila con Editar, Duplicar y Eliminar. Al editar se ve todo.
export default function ListaTipos({ tipos, fotos }: { tipos: Tipo[]; fotos: Record<string, ReactNode> }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => {
      setAviso(await accion());
      setConfirmando(null);
    });
  }

  return (
    <div>
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
      <ul className={styles.lista}>
        {tipos.map((t) => {
          const abierto = editando === t.id;
          return (
            <li key={t.id} className={styles.persona}>
              <div className={styles.personaCabecera}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 14, height: 14, borderRadius: "50%", background: colorDeTipo(t.color, t.nombre), flex: "none" }}
                  />
                  <div>
                    <strong>{t.nombre}</strong>
                    <div className={styles.ayuda}>
                      {t.servicio === "individual" ? "Individual" : "Grupal"} · {t.plazas_max} {t.plazas_max === 1 ? "plaza" : "plazas"} · {t.duracion_min} min
                      {!t.activo && " · Desactivada"}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.accionesItem}>
                <button type="button" className={styles.botonSecundario} aria-expanded={abierto} onClick={() => setEditando(abierto ? null : t.id)}>
                  {abierto ? "Cerrar" : "Editar"}
                </button>
                <button type="button" className={styles.botonSecundario} disabled={pendiente} onClick={() => ejecutar(() => duplicarTipo(t.id))}>
                  Duplicar
                </button>
                {confirmando === t.id ? (
                  <>
                    <button type="button" className={styles.boton} disabled={pendiente} onClick={() => ejecutar(() => eliminarTipo(t.id))}>
                      Sí, eliminar
                    </button>
                    <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(t.id)}>
                    Eliminar
                  </button>
                )}
              </div>
              {abierto && (
                <div className={styles.bloqueTipo}>
                  {fotos[t.id]}
                  <FormularioTipo tipo={t} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
