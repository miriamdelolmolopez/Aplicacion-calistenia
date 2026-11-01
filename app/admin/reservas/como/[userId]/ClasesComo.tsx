"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../../../admin.module.css";
import { anadirHechaComo, borrarReserva, cancelarComo, quitarHechaComo, registrarHechaComo, reservarComo, type Resultado } from "../../acciones";
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

// Las clases de un día, como las vería la persona, con los botones para reservar, cancelar o borrar en su nombre.
// En las clases que ya pasaron, Miriam puede registrarlas como hechas (descuenta una clase del bono) o quitarlas.
export default function ClasesComo({ userId, clases, tipos, dia, puedeAnadir }: { userId: string; clases: ClaseComo[]; tipos: { id: string; nombre: string }[]; dia: string; puedeAnadir: boolean }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; error: boolean } | null>(null);
  const [tipoNuevo, setTipoNuevo] = useState("");
  const [horaNueva, setHoraNueva] = useState("19:00");

  async function ejecutar(claseId: string, accion: () => Promise<Resultado>) {
    setTrabajando(claseId);
    setMensaje(null);
    const r = await accion();
    setTrabajando(null);
    setMensaje({ id: claseId, texto: r.error ?? r.mensaje ?? "", error: !r.ok });
    if (r.ok) router.refresh();
  }

  return (
    <>
      {clases.length === 0 && <p className={estilos.vacio}>No hay clases publicadas este día.</p>}
      {clases.map((c) => {
        const llena = c.ocupadas >= c.plazas;
        const hecha = c.pasada && c.reserva?.estado === "reservada";
        return (
          <section key={c.id} className={`${estilos.claseComo} ${c.cancelada ? estilos.cancelada : ""}`} style={{ borderLeftColor: c.color }}>
            <header>
              <strong>{c.nombre}</strong>
              <strong>{c.hora}</strong>
            </header>
            <p className={estilos.estadoClase}>
              {c.ocupadas}/{c.plazas} plazas
              {c.cancelada && " · clase cancelada"}
              {hecha && " · la tiene hecha"}
              {!c.pasada && c.reserva?.estado === "reservada" && " · tiene plaza"}
              {c.reserva?.estado === "cancelada_tarde" && " · canceló fuera de plazo: la clase le cuenta"}
            </p>
            <div className={estilos.accionesClase}>
              {/* Clase que ya pasó */}
              {c.pasada && hecha && (
                <button
                  type="button"
                  className={`${styles.boton} ${styles.botonSecundario}`}
                  disabled={trabajando === c.id}
                  onClick={() => {
                    if (confirm("¿Quitar esta clase y devolverle la clase al bono?")) ejecutar(c.id, () => quitarHechaComo(userId, c.reserva!.id));
                  }}
                >
                  Quitar (devolver la clase)
                </button>
              )}
              {c.pasada && !c.reserva && !c.cancelada && (
                <button type="button" className={styles.boton} disabled={trabajando === c.id} onClick={() => ejecutar(c.id, () => registrarHechaComo(userId, c.id))}>
                  Registrar como hecha
                </button>
              )}

              {/* Clase que todavía no ha empezado */}
              {!c.pasada && c.reserva?.estado === "reservada" && (
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
              {!c.pasada && !c.reserva && !c.cancelada && (
                <button type="button" className={styles.boton} disabled={trabajando === c.id || llena} onClick={() => ejecutar(c.id, () => reservarComo(userId, c.id))}>
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

      {puedeAnadir && tipos.length > 0 && (
        <section className={estilos.claseComo} style={{ borderLeftColor: "var(--acento)" }}>
          <header>
            <strong>Añadir otra clase de este día</strong>
          </header>
          <p className={estilos.estadoClase}>Para una clase que no sale en el calendario (por ejemplo, de antes de usar la app).</p>
          <div className={styles.formularioInterno}>
            <div className={styles.campo}>
              <label htmlFor="pasado-tipo">Tipo de clase</label>
              <select id="pasado-tipo" value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)}>
                <option value="" disabled>
                  Elige…
                </option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.campo}>
              <label htmlFor="pasado-hora">Hora</label>
              <input id="pasado-hora" type="time" value={horaNueva} onChange={(e) => setHoraNueva(e.target.value)} />
            </div>
            <button type="button" className={styles.boton} disabled={trabajando === "nueva" || !tipoNuevo || !horaNueva} onClick={() => ejecutar("nueva", () => anadirHechaComo(userId, tipoNuevo, dia, horaNueva))}>
              Registrar como hecha
            </button>
            {mensaje?.id === "nueva" && (
              <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
                {mensaje.texto}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
