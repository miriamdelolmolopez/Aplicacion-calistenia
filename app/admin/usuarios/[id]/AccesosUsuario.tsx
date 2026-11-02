"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SECCIONES_ADMIN } from "@/lib/seccionesAdmin";
import styles from "../../admin.module.css";
import AyudaI from "../../comunes/AyudaI";
import { archivarUsuario, desarchivarUsuario, eliminarUsuario, guardarAccesos } from "../acciones";
import estilos from "../usuarios.module.css";

type Accion = "guardar" | "archivar" | "borrar" | null;

const TIPOS = [
  { valor: "alumno", texto: "Alumno/a" },
  { valor: "invitado", texto: "Invitado/a" },
  { valor: "admin", texto: "Administradora" },
];

// Los accesos de la persona (tipo de cuenta, coach y secciones excluidas) y los botones de abajo: borrar, guardar y archivar.
export default function AccesosUsuario({
  userId,
  nombre,
  rolInicial,
  esCoachInicial,
  excluidosIniciales,
  esMiCuenta,
}: {
  userId: string;
  nombre: string;
  rolInicial: string;
  esCoachInicial: boolean;
  excluidosIniciales: string[];
  esMiCuenta: boolean;
}) {
  const router = useRouter();
  const archivado = rolInicial === "archivado";
  const [rol, setRol] = useState(archivado ? "alumno" : rolInicial);
  const [esCoach, setEsCoach] = useState(esCoachInicial);
  const [excluidos, setExcluidos] = useState<string[]>(excluidosIniciales);
  const [accion, setAccion] = useState<Accion>(null);
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const cambiado = rol !== rolInicial || esCoach !== esCoachInicial || excluidos.slice().sort().join() !== excluidosIniciales.slice().sort().join();
  const asciende = rol === "admin" && rolInicial !== "admin";

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
          <div className={styles.campo}>
            <span id="acc-tipo">
              Tipo de cuenta <AyudaI texto="Alumno/a y invitado/a usan la app como cliente. Administradora entra además al panel de administración." />
            </span>
            <div className={estilos.segmentos} role="radiogroup" aria-labelledby="acc-tipo">
              {TIPOS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  role="radio"
                  aria-checked={rol === t.valor}
                  disabled={esMiCuenta && t.valor !== "admin"}
                  className={`${estilos.segmento} ${rol === t.valor ? estilos.segmentoActivo : ""}`}
                  onClick={() => setRol(t.valor)}
                >
                  {t.texto}
                </button>
              ))}
            </div>
            {esMiCuenta && <span className={styles.ayuda}>Es tu cuenta: no puedes dejar de ser administradora.</span>}
          </div>

          <div className={styles.campo}>
            <span id="acc-coach">
              Es coach (entrenador/a) <AyudaI texto="Si es coach, sale al elegir quién da cada clase en los horarios y las plantillas. Entra a la app como alumno/a, pero ve y gestiona las clases que da: cancelarlas y marcar quién no vino." />
            </span>
            <div className={estilos.segmentos} role="radiogroup" aria-labelledby="acc-coach">
              {[
                { v: true, t: "Sí" },
                { v: false, t: "No" },
              ].map((o) => (
                <button key={o.t} type="button" role="radio" aria-checked={esCoach === o.v} className={`${estilos.segmento} ${esCoach === o.v ? estilos.segmentoActivo : ""}`} onClick={() => setEsCoach(o.v)}>
                  {o.t}
                </button>
              ))}
            </div>
          </div>

          {rol === "admin" && (
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
              <span className={styles.ayuda}>Todavía no se ocultan en el panel: de momento solo se guardan. Hasta que se active, una administradora ve todo.</span>
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
            {rol !== rolInicial && <li>Tipo de cuenta: {TIPOS.find((t) => t.valor === rol)?.texto}</li>}
            {esCoach !== esCoachInicial && <li>{esCoach ? "Pasa a ser coach" : "Deja de ser coach"}</li>}
            {rol === "admin" && <li>Secciones excluidas: {excluidos.length}</li>}
          </ul>
          {asciende && (
            <p className={styles.error}>
              Va a tener acceso al panel de administración: los pagos y los datos de todas las personas. Las exclusiones todavía no se aplican, así que verá todo.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={styles.boton} disabled={trabajando} onClick={() => ejecutar(() => guardarAccesos(userId, { rol, esCoach, excluidos }))}>
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
