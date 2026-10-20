"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../../admin.module.css";
import { borrarReserva, cancelarComo, reservarComo, type Resultado } from "../../acciones";
import estilos from "../../reservas.module.css";

export type ClaseComo = {
  id: string;
  hora: string;
  nombre: string;
  color: string;
  plazas: number;
  ocupadas: number;
  cancelada: boolean;
  reserva: { id: string; estado: "reservada" | "cancelada_tarde" } | null;
};

// Las clases de un día, como las vería la persona, con los botones para reservar, cancelar o borrar en su nombre.
export default function ClasesComo({ userId, clases }: { userId: string; clases: ClaseComo[] }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; error: boolean } | null>(null);

  async function ejecutar(claseId: string, accion: () => Promise<Resultado>) {
    setTrabajando(claseId);
    setMensaje(null);
    const r = await accion();
    setTrabajando(null);
    setMensaje({ id: claseId, texto: r.error ?? r.mensaje ?? "", error: !r.ok });
    if (r.ok) router.refresh();
  }

  if (clases.length === 0) return <p className={estilos.vacio}>No hay clases este día.</p>;

  return (
    <>
      {clases.map((c) => {
        const llena = c.ocupadas >= c.plazas;
        return (
          <section key={c.id} className={`${estilos.claseComo} ${c.cancelada ? estilos.cancelada : ""}`} style={{ borderLeftColor: c.color }}>
            <header>
              <strong>{c.nombre}</strong>
              <strong>{c.hora}</strong>
            </header>
            <p className={estilos.estadoClase}>
              {c.ocupadas}/{c.plazas} plazas
              {c.cancelada && " · clase cancelada"}
              {c.reserva?.estado === "reservada" && " · tiene plaza"}
              {c.reserva?.estado === "cancelada_tarde" && " · canceló fuera de plazo: la clase le cuenta"}
            </p>
            <div className={estilos.accionesClase}>
              {c.reserva?.estado === "reservada" && (
                <button
                  type="button"
                  className={`${styles.boton} ${styles.botonSecundario}`}
                  disabled={trabajando === c.id}
                  onClick={() => ejecutar(c.id, () => cancelarComo(userId, c.reserva!.id))}
                >
                  Cancelar
                </button>
              )}
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
              {!c.reserva && !c.cancelada && (
                <button
                  type="button"
                  className={styles.boton}
                  disabled={trabajando === c.id || llena}
                  onClick={() => ejecutar(c.id, () => reservarComo(userId, c.id))}
                >
                  {llena ? "Completa" : "Reservar"}
                </button>
              )}
            </div>
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
