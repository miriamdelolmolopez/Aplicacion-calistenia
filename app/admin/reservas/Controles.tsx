"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "../../Avatar";
import styles from "../admin.module.css";
import { cancelarClase } from "../clases/acciones";
import { apuntarAtleta, listarAtletasParaApuntar, marcarAsistencia, type Asistencia, type Atleta } from "./acciones";
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
  const [confirmando, setConfirmando] = useState<string | null>(null);

  async function marcarNoVino(p: PersonaClase) {
    setTrabajando(true);
    setError(null);
    const r = await marcarAsistencia(p.reservaId, p.asistencia === "no_asistio" ? null : "no_asistio");
    setTrabajando(false);
    setConfirmando(null);
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
                  // Marcar pregunta antes; quitar la marca (por si te equivocaste) es directo.
                  onClick={() => (p.asistencia === "no_asistio" ? marcarNoVino(p) : setConfirmando(p.reservaId))}
                >
                  ✗
                </button>
              </div>
              {confirmando === p.reservaId && (
                <div className={styles.aviso} role="alert" style={{ marginTop: 8 }}>
                  <p style={{ margin: "0 0 10px" }}>¿Vas a marcar que este atleta no se ha presentado?</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className={styles.boton} disabled={trabajando} onClick={() => marcarNoVino(p)}>
                      {trabajando ? "Guardando…" : "Confirmar"}
                    </button>
                    <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={() => setConfirmando(null)}>
                      Descartar
                    </button>
                  </div>
                </div>
              )}
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

// Elegir a quién apuntar a la clase: buscador y lista de personas que tienen ese servicio y aún no están apuntadas.
function ApuntarAtleta({ clase, alCerrar }: { clase: ClaseDelDia; alCerrar: () => void }) {
  const router = useRouter();
  const [atletas, setAtletas] = useState<Atleta[] | null>(null);
  const [busca, setBusca] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    let vigente = true;
    listarAtletasParaApuntar(clase.id).then((r) => {
      if (!vigente) return;
      if (r.ok) setAtletas(r.atletas ?? []);
      else {
        setAtletas([]);
        setMensaje({ texto: r.error ?? "No se ha podido cargar la lista.", error: true });
      }
    });
    return () => {
      vigente = false;
    };
  }, [clase.id]);

  async function apuntar(a: Atleta) {
    setTrabajando(a.id);
    setMensaje(null);
    const r = await apuntarAtleta(a.id, clase.id);
    setTrabajando(null);
    if (!r.ok) return setMensaje({ texto: r.error ?? "No se ha podido apuntar.", error: true });
    setAtletas((lista) => (lista ?? []).filter((x) => x.id !== a.id));
    setMensaje({ texto: `${a.nombre} apuntada. ${r.mensaje ?? ""}`.trim(), error: false });
    router.refresh();
  }

  const q = busca.trim().toLowerCase();
  const visibles = (atletas ?? []).filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.correo.toLowerCase().includes(q));

  return (
    <div className={estilos.fondo} onClick={alCerrar}>
      <div className={estilos.hoja} role="dialog" aria-label="Apuntar a una atleta" onClick={(e) => e.stopPropagation()}>
        <div className={estilos.hojaCabecera}>
          <h2>
            Apuntar a una atleta · {clase.hora} {clase.nombre}
          </h2>
          <button type="button" className={estilos.cierra} aria-label="Cerrar" onClick={alCerrar}>
            ✕
          </button>
        </div>
        <p className={styles.ayuda}>
          {clase.personas.length}/{clase.plazas} plazas ocupadas.
        </p>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar por nombre o correo" autoFocus />
        {mensaje && (
          <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
            {mensaje.texto}
          </p>
        )}
        {atletas === null && <p className={styles.ayuda}>Cargando…</p>}
        {atletas !== null && visibles.length === 0 && <p className={styles.ayuda}>{q ? "Nadie coincide con esa búsqueda." : "No hay nadie más a quien apuntar."}</p>}
        {visibles.map((a) => (
          <button key={a.id} type="button" className={estilos.opcionAtleta} disabled={trabajando !== null} onClick={() => apuntar(a)}>
            <strong>{a.nombre}</strong>
            <small>{trabajando === a.id ? "Apuntando…" : a.correo}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tres puntitos abajo a la derecha de la clase: opciones de la clase. Una clase llena no deja apuntar a nadie más.
function MenuClase({ clase }: { clase: ClaseDelDia }) {
  const [menu, setMenu] = useState(false);
  const [apuntando, setApuntando] = useState(false);
  const llena = clase.personas.length >= clase.plazas;

  return (
    <div className={estilos.menuClase}>
      <button type="button" className={estilos.tresPuntos} aria-label="Más opciones de la clase" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
        ⋯
      </button>
      {menu && (
        <div className={estilos.menuLista} role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={llena}
            onClick={() => {
              setMenu(false);
              setApuntando(true);
            }}
          >
            Apuntar a una atleta
            {llena && <small> · clase llena</small>}
          </button>
        </div>
      )}
      {apuntando && <ApuntarAtleta clase={clase} alCerrar={() => setApuntando(false)} />}
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
      {!clase.cancelada && !clase.pasada && <MenuClase clase={clase} />}

      {listado !== undefined && <Listado clase={clase} elegida={listado} alCerrar={() => setListado(undefined)} />}
    </details>
  );
}
