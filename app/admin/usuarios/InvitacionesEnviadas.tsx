"use client";

import { useState, useTransition } from "react";
import styles from "../admin.module.css";
import { quitarInvitacion, reenviarInvitacion } from "./acciones";

export type InvitacionFila = { id: string; correo: string; enviado: boolean; creada: string };

// Personas invitadas por correo que todavía no han creado su cuenta.
export default function InvitacionesEnviadas({ invitaciones }: { invitaciones: InvitacionFila[] }) {
  const [pendiente, empezar] = useTransition();
  const [mensajes, setMensajes] = useState<Record<string, string>>({});
  if (invitaciones.length === 0) return null;

  function reenviar(id: string) {
    empezar(async () => {
      const r = await reenviarInvitacion(id);
      setMensajes((m) => ({ ...m, [id]: r.ok ? "Enviada de nuevo." : (r.error ?? "No se ha podido enviar.") }));
    });
  }

  return (
    <section className={styles.tarjeta}>
      <h2>Invitaciones enviadas ({invitaciones.length})</h2>
      <p className={styles.ayuda}>Personas que has invitado y todavía no han creado su cuenta. Cuando se registren, salen en la lista de abajo y desaparecen de aquí.</p>
      <ul className={styles.lista}>
        {invitaciones.map((i) => (
          <li key={i.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span>
              <strong>{i.correo}</strong> · {i.creada} · {i.enviado ? "enviada" : "el correo no salió"}
            </span>
            <button type="button" className={styles.boton} disabled={pendiente} onClick={() => reenviar(i.id)}>
              Reenviar
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente} onClick={() => empezar(async () => void (await quitarInvitacion(i.id)))}>
              Quitar
            </button>
            {mensajes[i.id] && <span className={styles.ayuda}>{mensajes[i.id]}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
