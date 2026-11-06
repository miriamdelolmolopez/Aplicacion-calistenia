"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { fechaCorta, textoHora } from "@/lib/fechas";
import { useIdioma } from "../useIdioma";
import { borrarNotificacion, marcarLeidas, obtenerMisNotificaciones, type NotificacionFila } from "./acciones";

// Lista de avisos de la persona. Al abrirla se marcan como leídas (las que no se habían visto salen resaltadas).
export default function Notificaciones() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [lista, setLista] = useState<NotificacionFila[] | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerMisNotificaciones()
      .then(async (filas) => {
        if (!vigente) return;
        setLista(filas);
        if (filas.some((f) => !f.leida)) await marcarLeidas();
      })
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, []);

  async function quitar(id: string) {
    setLista((l) => (l ?? []).filter((x) => x.id !== id));
    await borrarNotificacion(id);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{en ? "Notifications" : "Avisos"}</h1>
      <p className={styles.ayuda}>
        {en ? "Choose which ones you get in " : "Elige cuáles recibes en "}
        <Link href="/ajustes/notificaciones">{en ? "Settings → Notifications" : "Ajustes → Notificaciones"}</Link>.
      </p>
      {lista === null && <p className={styles.ayuda}>…</p>}
      {lista?.length === 0 && <p className={styles.ayuda}>{en ? "You have no notifications." : "No tienes avisos."}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {(lista ?? []).map((n) => {
          const cuerpo = (
            <>
              <strong>{n.titulo}</strong>
              {n.cuerpo && <p style={{ margin: "4px 0 0" }}>{n.cuerpo}</p>}
              <small className={styles.ayuda}>
                {fechaCorta(n.creada_en, en ? "en" : "es")} · {textoHora(n.creada_en)}
              </small>
            </>
          );
          return (
            <section key={n.id} className={styles.tarjeta} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", borderLeft: n.leida ? undefined : "4px solid #1fd8e4" }}>
              <div>{n.enlace ? <Link href={n.enlace} style={{ color: "inherit", textDecoration: "none" }}>{cuerpo}</Link> : cuerpo}</div>
              <button type="button" onClick={() => quitar(n.id)} aria-label={en ? "Delete" : "Borrar"} style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", fontSize: "1.1rem" }}>
                ✕
              </button>
            </section>
          );
        })}
      </div>
    </main>
  );
}
