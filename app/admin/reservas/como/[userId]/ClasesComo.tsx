"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CancelarClaseAdmin from "../../../../clases/CancelarClaseAdmin";
import Avatar from "../../../../Avatar";
import styles from "../../../admin.module.css";
import { borrarReserva, cancelarComo, marcarAsistencia, registrarHechaComo, reservarComo, type Asistencia, type Resultado } from "../../acciones";
import estilos from "../../reservas.module.css";

export type ApuntadoComo = { reservaId: string; userId: string; estado: "reservada" | "cancelada_tarde"; asistencia: Asistencia; nombre: string; foto: string | null };

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
  incluido: boolean; // la persona tiene contratado el servicio de esta clase
  apuntados: ApuntadoComo[];
};

// Las clases de un día, como las vería la persona (pasadas, de hoy o futuras): con las fotos de quien se apuntó
// y los huecos que quedaron. Se puede reservar o cancelar en su nombre, o tocar la foto de cualquiera para hacer lo mismo con esa persona.
// «Cancelar reserva» sigue la regla de siempre; si la clase le cuenta, una segunda pulsación («Borrar») se la devuelve.
export default function ClasesComo({ userId, clases, dia }: { userId: string; clases: ClaseComo[]; dia: string }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<{ claseId: string; reservaId: string } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; error: boolean } | null>(null);

  async function ejecutar(claseId: string, accion: () => Promise<Resultado>) {
    setTrabajando(claseId);
    setMensaje(null);
    const r = await accion();
    setTrabajando(null);
    setMensaje({ id: claseId, texto: r.error ?? r.mensaje ?? "", error: !r.ok });
    if (r.ok) {
      setAbierta(null);
      router.refresh();
    }
  }

  return (
    <>
      {clases.length === 0 && <p className={estilos.vacio}>No hay clases publicadas este día.</p>}
      {clases.map((c) => {
        const llena = c.ocupadas >= c.plazas;
        const libres = Math.max(c.plazas - c.ocupadas, 0);
        const sueltas = Math.max(0, Math.min(c.plazas - c.apuntados.length, 12));
        const seleccionada = abierta?.claseId === c.id ? c.apuntados.find((a) => a.reservaId === abierta.reservaId) : undefined;
        return (
          <section key={c.id} className={`${estilos.claseComo} ${c.cancelada ? estilos.cancelada : ""}`} style={{ borderLeftColor: c.color }}>
            <header>
              <strong>{c.nombre}</strong>
              <strong>{c.hora}</strong>
            </header>
            <p className={estilos.estadoClase}>
              {libres} {libres === 1 ? "libre" : "libres"} · {c.ocupadas}/{c.plazas} plazas
              {c.cancelada && " · clase cancelada"}
              {c.reserva?.estado === "reservada" && (c.pasada ? " · la tiene hecha" : " · tiene plaza")}
              {c.reserva?.estado === "cancelada_tarde" && " · canceló fuera de plazo: la clase le cuenta"}
            </p>

            {/* Quien estaba apuntado (fotos) y los huecos que quedaron */}
            <div className={estilos.cuadros}>
              {c.apuntados.map((a) => (
                <button
                  key={a.reservaId}
                  type="button"
                  className={`${estilos.cuadro} ${a.estado === "cancelada_tarde" ? estilos.cuadroNoVino : ""}`}
                  title={a.nombre}
                  aria-label={`${a.nombre}: ver opciones`}
                  onClick={() => setAbierta(seleccionada?.reservaId === a.reservaId ? null : { claseId: c.id, reservaId: a.reservaId })}
                >
                  <Avatar nombre={a.nombre} url={a.foto} tamano={64} />
                  {a.estado === "cancelada_tarde" && <span className={estilos.insignia}>cuenta</span>}
                </button>
              ))}
              {Array.from({ length: sueltas }, (_, i) => (
                <span key={`libre-${i}`} className={estilos.cuadroLibre} aria-hidden="true" />
              ))}
            </div>

            {/* Quien se toque: su perfil, sus reservas y «no se presentó» (igual que en Reservas) */}
            {seleccionada && (
              <div className={styles.aviso}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>{seleccionada.nombre}</strong>
                  {seleccionada.estado === "cancelada_tarde" ? " · canceló fuera de plazo: la clase le cuenta" : seleccionada.asistencia === "no_asistio" ? " · No se presentó" : ""}
                </p>
                <div className={estilos.botonesFila}>
                  <Link href={`/admin/usuarios/${seleccionada.userId}`} className={estilos.marca} aria-label={`Perfil de ${seleccionada.nombre}`} title="Ver su perfil">
                    👤
                  </Link>
                  <Link href={`/admin/reservas/como/${seleccionada.userId}?dia=${dia}`} className={estilos.marca} aria-label={`Reservas de ${seleccionada.nombre}`} title="Ver y cambiar sus reservas, como si fueras ella">
                    📅
                  </Link>
                  <button
                    type="button"
                    className={`${estilos.marca} ${seleccionada.asistencia === "no_asistio" ? estilos.novino : ""}`}
                    aria-pressed={seleccionada.asistencia === "no_asistio"}
                    aria-label={`${seleccionada.nombre} no se presentó`}
                    title="No se presentó"
                    disabled={trabajando === c.id}
                    // Marcar pregunta antes; quitar la marca (por si te equivocaste) es directo.
                    onClick={() => (seleccionada.asistencia === "no_asistio" ? ejecutar(c.id, () => marcarAsistencia(seleccionada.reservaId, null)) : setConfirmando(seleccionada.reservaId))}
                  >
                    ✗
                  </button>
                </div>
                {confirmando === seleccionada.reservaId && (
                  <div style={{ marginTop: 8 }} role="alert">
                    <p style={{ margin: "0 0 10px" }}>¿Vas a marcar que este atleta no se ha presentado?</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className={styles.boton} disabled={trabajando === c.id} onClick={() => ejecutar(c.id, async () => { setConfirmando(null); return marcarAsistencia(seleccionada.reservaId, "no_asistio"); })}>
                        Confirmar
                      </button>
                      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(null)}>
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={estilos.accionesClase}>
              {c.reserva?.estado === "reservada" && (
                <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando === c.id} onClick={() => ejecutar(c.id, () => cancelarComo(userId, c.reserva!.id))}>
                  Cancelar reserva
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
              {/* Reservar vale para cualquier clase que tenga contratada: en las que ya pasaron queda como hecha */}
              {!c.reserva && !c.cancelada && c.incluido && (
                <button
                  type="button"
                  className={styles.boton}
                  disabled={trabajando === c.id || (!c.pasada && llena)}
                  onClick={() => ejecutar(c.id, () => (c.pasada ? registrarHechaComo(userId, c.id) : reservarComo(userId, c.id)))}
                >
                  {!c.pasada && llena ? "Completa" : "Reservar"}
                </button>
              )}
              {!c.reserva && !c.cancelada && !c.incluido && <span className={styles.ayuda}>No lo tiene contratado</span>}
            </div>
            {!c.pasada && !c.cancelada && <CancelarClaseAdmin sesionId={c.id} personas={c.ocupadas} alTerminar={() => router.refresh()} />}
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
