"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "../../Avatar";
import styles from "../admin.module.css";
import { cancelarClase } from "../clases/acciones";
import { marcarAsistencia, type Asistencia } from "./acciones";
import estilos from "./reservas.module.css";

export type PersonaClase = {
  reservaId: string;
  userId: string;
  nombre: string;
  foto: string | null;
  prueba: boolean;
  asistencia: Asistencia;
};

export type ClaseDelDia = {
  id: string;
  dia: string; // AAAA-MM-DD
  hora: string;
  nombre: string;
  color: string;
  plazas: number;
  cancelada: boolean;
  pasada: boolean;
  personas: PersonaClase[];
};

// Si no se marca nada, se entiende que ha venido (solo se anota quien NO se presenta).
function estadoTexto(p: PersonaClase, pasada: boolean): string {
  const partes: string[] = [];
  if (p.prueba) partes.push("Clase de prueba");
  if (p.asistencia === "no_asistio") partes.push("No se presentó");
  else if (pasada) partes.push("Vino");
  return partes.join(" · ");
}

// Listado de las personas de una clase, con sus opciones: perfil, reservas, vino y no se presentó.
function Listado({ clase, elegida, alCerrar }: { clase: ClaseDelDia; elegida: string | null; alCerrar: () => void }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function marcarNoVino(p: PersonaClase) {
    setTrabajando(true);
    setError(null);
    const r = await marcarAsistencia(p.reservaId, p.asistencia === "no_asistio" ? null : "no_asistio");
    setTrabajando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido guardar.");
    router.refresh();
  }

  return (
    <div className={estilos.fondo} onClick={alCerrar}>
      <div className={estilos.hoja} role="dialog" aria-label={`Personas de ${clase.nombre}`} onClick={(e) => e.stopPropagation()}>
        <div className={estilos.hojaCabecera}>
          <h2>
            {clase.hora} · {clase.nombre}
          </h2>
          <button type="button" className={estilos.cierra} aria-label="Cerrar" onClick={alCerrar}>
            ✕
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {[...clase.personas]
          .sort((a, b) => (a.userId === elegida ? -1 : b.userId === elegida ? 1 : 0))
          .map((p) => (
            <div key={p.reservaId} className={`${estilos.tarjetaPersona} ${p.userId === elegida ? estilos.tarjetaElegida : ""}`}>
              <div className={estilos.personaCabecera}>
                <Avatar nombre={p.nombre} url={p.foto} tamano={56} />
                <div className={estilos.personaDatos}>
                  <strong>{p.nombre}</strong>
                  <span className={styles.ayuda}>{estadoTexto(p, clase.pasada)}</span>
                </div>
              </div>
              <div className={estilos.botonesFila} style={{ marginTop: 8 }}>
                <Link href={`/admin/usuarios/${p.userId}`} className={estilos.marca} aria-label={`Perfil de ${p.nombre}`} title="Ver su perfil">
                  👤
                </Link>
                <Link
                  href={`/admin/reservas/como/${p.userId}?dia=${clase.dia}`}
                  className={estilos.marca}
                  aria-label={`Reservas de ${p.nombre}`}
                  title="Ver y cambiar sus reservas, como si fueras ella"
                >
                  📅
                </Link>
                <button
                  type="button"
                  className={`${estilos.marca} ${p.asistencia === "no_asistio" ? estilos.novino : ""}`}
                  aria-pressed={p.asistencia === "no_asistio"}
                  aria-label={`${p.nombre} no se presentó`}
                  title="No se presentó"
                  disabled={trabajando}
                  onClick={() => marcarNoVino(p)}
                >
                  ✗
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Cancelar la clase entera: devuelve su clase a todas las personas y alarga su bono los días que digas.
function CancelarClase({ clase }: { clase: ClaseDelDia }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("¿Cancelar esta clase? Se devolverá su clase a todas las personas apuntadas.")) return;
    setTrabajando(true);
    const r = await cancelarClase({}, new FormData(e.currentTarget));
    setTrabajando(false);
    setMensaje({ texto: r.error ?? r.mensaje ?? "", error: !!r.error });
    if (!r.error) router.refresh();
  }

  return (
    <div>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Cerrar" : "Cancelar la clase"}
      </button>
      {abierto && (
        <form onSubmit={enviar} className={styles.formularioInterno}>
          <input type="hidden" name="sesionId" value={clase.id} />
          <p className={styles.ayuda}>
            Se devolverá su clase a las {clase.personas.length} personas apuntadas. Puedes alargar sus bonos unos días.
          </p>
          <div className={styles.campo}>
            <label htmlFor={`dias-${clase.id}`}>¿Cuántos días alargas su bono?</label>
            <input id={`dias-${clase.id}`} name="dias" type="number" min={0} max={60} defaultValue={0} />
            <span className={styles.ayuda}>0 = no alargar. Por lluvia, tu política es 7 días.</span>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`motivo-${clase.id}`}>Motivo (opcional)</label>
            <input id={`motivo-${clase.id}`} name="motivo" maxLength={200} />
          </div>
          <button className={styles.boton} type="submit" disabled={trabajando}>
            {trabajando ? "Cancelando…" : "Cancelar la clase y devolver las clases"}
          </button>
          {mensaje && (
            <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
              {mensaje.texto}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

// Una clase del día: título, hora y plazas; abierta por defecto con las fotos de quien está apuntado.
export function TarjetaClase({ clase }: { clase: ClaseDelDia }) {
  const [listado, setListado] = useState<string | null | undefined>(undefined); // undefined = cerrado
  const libres = Math.max(0, Math.min(clase.plazas - clase.personas.length, 12));

  return (
    <details open className={`${estilos.clase} ${clase.cancelada ? estilos.cancelada : ""}`} style={{ borderLeftColor: clase.color }}>
      <summary className={estilos.resumen}>
        <span className={estilos.hora}>{clase.hora}</span>
        <span className={estilos.nombre}>
          <strong>
            {clase.nombre}
            {clase.cancelada && " (cancelada)"}
          </strong>
          <small>
            {clase.personas.length}/{clase.plazas} plazas
          </small>
        </span>
      </summary>

      <div className={estilos.cuadros}>
        {clase.personas.map((p) => (
          <button
            key={p.reservaId}
            type="button"
            className={`${estilos.cuadro} ${p.asistencia === "no_asistio" ? estilos.cuadroNoVino : ""}`}
            title={p.nombre}
            aria-label={`${p.nombre}: ver opciones`}
            onClick={() => setListado(p.userId)}
          >
            <Avatar nombre={p.nombre} url={p.foto} tamano={64} />
            {p.prueba && <span className={estilos.insignia}>prueba</span>}
          </button>
        ))}
        {Array.from({ length: libres }, (_, i) => (
          <span key={`libre-${i}`} className={estilos.cuadroLibre} aria-hidden="true" />
        ))}
      </div>
      {clase.personas.length === 0 && <p className={styles.ayuda}>Nadie apuntado todavía.</p>}

      {!clase.cancelada && <CancelarClase clase={clase} />}

      {listado !== undefined && <Listado clase={clase} elegida={listado} alCerrar={() => setListado(undefined)} />}
    </details>
  );
}
