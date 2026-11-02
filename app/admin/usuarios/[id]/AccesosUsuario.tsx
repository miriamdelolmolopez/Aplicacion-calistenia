"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SECCIONES_ADMIN } from "@/lib/seccionesAdmin";
import styles from "../../admin.module.css";
import AyudaI from "../../comunes/AyudaI";
import { archivarUsuario, desarchivarUsuario, eliminarUsuario, guardarAccesos } from "../acciones";
import estilos from "../usuarios.module.css";

type Accion = "guardar" | "archivar" | "borrar" | null;

type Opciones = { alumno: boolean; exalumno: boolean; coach: boolean; invitado: boolean; admin: boolean };

const OPCIONES: { clave: keyof Opciones; texto: string; ayuda: string }[] = [
  { clave: "alumno", texto: "Alumno/a", ayuda: "Alumno/a actual: reserva clases y tiene tarifas." },
  { clave: "exalumno", texto: "Exalumno/a", ayuda: "Ha sido alumno/a alguna vez pero ahora no lo es. No puede serlo a la vez que alumno/a ni que invitado/a." },
  { clave: "coach", texto: "Coach", ayuda: "Sale al elegir quién da cada clase en los horarios y las plantillas. Entra a la app como alumno/a, pero ve y gestiona las clases que da: cancelarlas y marcar quién no vino." },
  { clave: "invitado", texto: "Invitado/a", ayuda: "Tiene gratis lo que le hayas dado (prueba). No puede ser alumno/a, exalumno/a ni administradora a la vez." },
  { clave: "admin", texto: "Administradora", ayuda: "Entra al panel de administración. Puede ser también coach y alumna." },
];

function inicialDe(rol: string, esCoach: boolean, tambienAlumno: boolean, fueAlumno: boolean): Opciones {
  const alumno = rol === "alumno" || (rol === "admin" && tambienAlumno);
  const invitado = rol === "invitado";
  return { alumno, exalumno: !alumno && !invitado && (rol === "exalumno" || fueAlumno), coach: esCoach || rol === "coach", invitado, admin: rol === "admin" };
}

// Los accesos de la persona (tipo de cuenta, coach y secciones excluidas) y los botones de abajo: borrar, guardar y archivar.
export default function AccesosUsuario({
  userId,
  nombre,
  rolInicial,
  esCoachInicial,
  tambienAlumno,
  fueAlumno,
  excluidosIniciales,
  esMiCuenta,
}: {
  userId: string;
  nombre: string;
  rolInicial: string;
  esCoachInicial: boolean;
  tambienAlumno: boolean;
  fueAlumno: boolean;
  excluidosIniciales: string[];
  esMiCuenta: boolean;
}) {
  const router = useRouter();
  const archivado = rolInicial === "archivado";
  const inicial = inicialDe(rolInicial, esCoachInicial, tambienAlumno, fueAlumno);
  const [op, setOp] = useState<Opciones>(inicial);
  const [excluidos, setExcluidos] = useState<string[]>(excluidosIniciales);
  const [accion, setAccion] = useState<Accion>(null);
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const cambiado = OPCIONES.some((o) => op[o.clave] !== inicial[o.clave]) || excluidos.slice().sort().join() !== excluidosIniciales.slice().sort().join();
  const asciende = op.admin && !inicial.admin;

  // Cada opción se activa o desactiva por separado; las que no pueden ir juntas se desactivan solas.
  function cambiar(clave: keyof Opciones, valor: boolean) {
    setOp((x) => {
      const n = { ...x, [clave]: valor };
      if (valor && clave === "alumno") { n.exalumno = false; n.invitado = false; }
      if (valor && clave === "exalumno") { n.alumno = false; n.invitado = false; }
      if (valor && clave === "invitado") { n.alumno = false; n.exalumno = false; n.admin = false; }
      if (valor && clave === "admin") n.invitado = false;
      return n;
    });
  }

  async function ejecutar(hacer: () => Promise<{ ok: boolean; error?: string }>, destino?: string) {
    setTrabajando(true);
    setError(null);
    const r = await hacer();
    setTrabajando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido hacer.");
    setAccion(null);
    setTexto("");
    if (destino) router.push(destino);
    else {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    }
    router.refresh();
  }

  const marcar = (clave: string) => setExcluidos((x) => (x.includes(clave) ? x.filter((c) => c !== clave) : [...x, clave]));

  return (
    <div className={styles.formularioInterno}>
      {archivado ? (
        <p className={styles.aviso}>
          <strong>{nombre}</strong> está archivada: no sale en las listas ni puede entrar. Sus datos y pagos se conservan y salen en Descargar datos (CSV).
        </p>
      ) : (
        <>
          {OPCIONES.map((o) => (
            <div key={o.clave} className={styles.campo}>
              <span id={`acc-${o.clave}`}>
                {o.texto} <AyudaI texto={o.ayuda} />
              </span>
              <div className={estilos.segmentos} role="radiogroup" aria-labelledby={`acc-${o.clave}`}>
                {[
                  { v: true, t: "Sí" },
                  { v: false, t: "No" },
                ].map((s) => (
                  <button
                    key={s.t}
                    type="button"
                    role="radio"
                    aria-checked={op[o.clave] === s.v}
                    disabled={esMiCuenta && o.clave === "admin"}
                    className={`${estilos.segmento} ${op[o.clave] === s.v ? estilos.segmentoActivo : ""}`}
                    onClick={() => cambiar(o.clave, s.v)}
                  >
                    {s.t}
                  </button>
                ))}
              </div>
              {esMiCuenta && o.clave === "admin" && <span className={styles.ayuda}>Es tu cuenta: no puedes dejar de ser administradora.</span>}
            </div>
          ))}

          {op.admin && (
            <div className={styles.campo}>
              <span>
                Excluidos <AyudaI texto="Secciones del panel que esta administradora NO puede usar. Dejar todas sin marcar es acceso completo." />
              </span>
              <details>
                <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 600 }}>
                  {excluidos.length === 0 ? "Ninguna (acceso completo)" : `${excluidos.length} excluida${excluidos.length === 1 ? "" : "s"}`}
                </summary>
                {SECCIONES_ADMIN.map((s) => (
                  <label key={s.clave} className={styles.casilla}>
                    <input type="checkbox" checked={excluidos.includes(s.clave)} onChange={() => marcar(s.clave)} />
                    {s.texto}
                  </label>
                ))}
              </details>
              <span className={styles.ayuda}>Estas secciones no salen en su panel ni en su menú, y si entra por un enlace no se las enseña. Tampoco puede hacer esas acciones por detrás.</span>
            </div>
          )}
        </>
      )}

      {accion === null && (
        <div className={estilos.filaBotones}>
          <button type="button" className={estilos.botonBorrar} onClick={() => setAccion("borrar")}>
            Borrar
          </button>
          {archivado ? (
            <button type="button" className={estilos.botonGuardar} disabled={trabajando} onClick={() => ejecutar(() => desarchivarUsuario(userId))}>
              {trabajando ? "Recuperando…" : "Recuperar"}
            </button>
          ) : (
            <>
              <button type="button" className={estilos.botonGuardar} disabled={!cambiado} onClick={() => setAccion("guardar")}>
                Guardar
              </button>
              <button type="button" className={estilos.botonArchivar} onClick={() => setAccion("archivar")}>
                Archivar
              </button>
            </>
          )}
        </div>
      )}
      {guardado && (
        <p className={styles.aviso} role="status">
          Guardado.
        </p>
      )}

      {accion === "guardar" && (
        <div role="alertdialog" aria-label="Confirmar guardar" className={styles.aviso}>
          <p>
            ¿Guardar los cambios de accesos de <strong>{nombre}</strong>?
          </p>
          <ul>
            {OPCIONES.filter((o) => op[o.clave] !== inicial[o.clave]).map((o) => (
              <li key={o.clave}>
                {o.texto}: {op[o.clave] ? "Sí" : "No"}
              </li>
            ))}
            {op.admin && <li>Secciones excluidas: {excluidos.length}</li>}
          </ul>
          {asciende && (
            <p className={styles.error}>
              Va a tener acceso al panel de administración: los pagos y los datos de todas las personas. Si quieres que no vea alguna sección, márcala en «Excluidos» antes de guardar.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={styles.boton} disabled={trabajando} onClick={() => ejecutar(() => guardarAccesos(userId, { ...op, excluidos }))}>
              {trabajando ? "Guardando…" : "Sí, guardar"}
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={() => setAccion(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {accion === "archivar" && (
        <div role="alertdialog" aria-label="Confirmar archivar" className={styles.aviso}>
          <p>
            Vas a archivar a <strong>{nombre}</strong>.
          </p>
          <ul>
            <li>Desaparece de las listas y no puede iniciar sesión.</li>
            <li>Se quitan sus reservas de clases que aún no han empezado.</li>
            <li>Sus datos, bonos y pagos se conservan y salen en Descargar datos (CSV). Puedes recuperarla cuando quieras.</li>
          </ul>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={styles.boton} disabled={trabajando} onClick={() => ejecutar(() => archivarUsuario(userId), "/admin/usuarios")}>
              {trabajando ? "Archivando…" : "Sí, archivar"}
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={() => setAccion(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {accion === "borrar" && (
        <div role="alertdialog" aria-label="Confirmar borrado" className={styles.aviso}>
          {archivado ? (
            <>
              <p className={styles.error}>
                Borrado definitivo, solo si la persona lo pide por ley. Se borran su cuenta, sus datos, reservas, bonos, entrenos, progreso, fotos y aceptaciones. No se puede deshacer. Los pagos se conservan (con su nombre y DNI) por obligación fiscal.
              </p>
              <div className={styles.campo}>
                <label htmlFor="confirmar-borrado">Para confirmar, escribe ELIMINAR</label>
                <input id="confirmar-borrado" value={texto} autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className={styles.boton} disabled={trabajando || texto.trim().toUpperCase() !== "ELIMINAR"} onClick={() => ejecutar(() => eliminarUsuario(userId), "/admin/usuarios")}>
                  {trabajando ? "Eliminando…" : "Eliminar para siempre"}
                </button>
                <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={() => { setAccion(null); setTexto(""); }}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Para no perder datos, <strong>primero hay que archivar</strong> a la persona. El borrado definitivo solo se hace si lo pide por ley.
              </p>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAccion(null)}>
                Entendido
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
