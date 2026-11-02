"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../../admin.module.css";
import { borrarReserva, quitarReservaComo, reservarComo, type Resultado } from "../../acciones";
import estilos from "../../reservas.module.css";

export type ClaseComo = {
  id: string;
  pasada: boolean; // la clase ya ha empezado
  hora: string;
  nombre: string;
  color: string;
  plazas: number;
  ocupadas: number;
  cancelada: boolean;
  reserva: { id: string; estado: "reservada" | "cancelada_tarde" } | null;
};

// Las clases de un día, como las vería la persona: plazas libres y ocupadas, y reservar o quitar la reserva en su nombre.
export default function ClasesComo({ userId, clases }: { userId: string; clases: ClaseComo[] }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; error: boolean } | null>(null);

  async function ejecutar(claseId: string, accion: () => Promise<Resultado>) {
    setTrabajando(claseId);
    setMensaje(null);
    const r = await accion();
    setTrabajando(null);
    setQuitando(null);
    setMensaje({ id: claseId, texto: r.error ?? r.mensaje ?? "", error: !r.ok });
    if (r.ok) router.refresh();
  }

  return (
    <>
      {clases.length === 0 && <p className={estilos.vacio}>No hay clases publicadas este día.</p>}
      {clases.map((c) => {
        const llena = c.ocupadas >= c.plazas;
        const libres = Math.max(c.plazas - c.ocupadas, 0);
        return (
          <section key={c.id} className={`${estilos.claseComo} ${c.cancelada ? estilos.cancelada : ""}`} style={{ borderLeftColor: c.color }}>
            <header>
              <strong>{c.nombre}</strong>
              <strong>{c.hora}</strong>
            </header>
            <p className={estilos.estadoClase}>
              {libres} {libres === 1 ? "libre" : "libres"} · {c.ocupadas}/{c.plazas} plazas
              {c.cancelada && " · clase cancelada"}
              {c.reserva?.estado === "reservada" && " · tiene plaza"}
              {c.reserva?.estado === "cancelada_tarde" && " · canceló fuera de plazo: la clase le cuenta"}
            </p>
            <div className={estilos.accionesClase}>
              {/* Tiene plaza: se puede quitar decidiendo qué pasa con su clase */}
              {c.reserva?.estado === "reservada" && quitando !== c.id && (
                <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando === c.id} onClick={() => setQuitando(c.id)}>
                  Quitar reserva
                </button>
              )}
              {/* Canceló tarde: la clase le cuenta; se la puedes devolver */}
              {c.reserva?.estado === "cancelada_tarde" && (
                <button
                  type="button"
                  className={styles.boton}
                  disabled={trabajando === c.id}
                  onClick={() => {
                    if (confirm("¿Borrar la reserva y devolverle la clase?")) ejecutar(c.id, () => borrarReserva(c.reserva!.id));
                  }}
                >
                  Borrar (devolver la clase)
                </button>
              )}
              {/* Sin reserva, y la clase todavía no ha empezado */}
              {!c.pasada && !c.reserva && !c.cancelada && (
                <button type="button" className={styles.boton} disabled={trabajando === c.id || llena} onClick={() => ejecutar(c.id, () => reservarComo(userId, c.id))}>
                  {llena ? "Completa" : "Reservar"}
                </button>
              )}
            </div>

            {quitando === c.id && c.reserva && (
              <div className={styles.aviso} role="alert">
                <p style={{ margin: "0 0 10px" }}>¿Qué hago con su clase?</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className={styles.boton} disabled={trabajando === c.id} onClick={() => ejecutar(c.id, () => quitarReservaComo(userId, c.reserva!.id, true))}>
                    Devolverle la clase
                  </button>
                  <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando === c.id} onClick={() => ejecutar(c.id, () => quitarReservaComo(userId, c.reserva!.id, false))}>
                    Que la pierda
                  </button>
                  <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setQuitando(null)}>
                    Volver
                  </button>
                </div>
              </div>
            )}

            {mensaje?.id === c.id && (
              <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
                {mensaje.texto}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
