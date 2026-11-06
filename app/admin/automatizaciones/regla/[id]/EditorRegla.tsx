"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../../../admin.module.css";
import estilos from "../../automatizaciones.module.css";
import { eliminarRegla, ejecutarReglaAhora, guardarRegla, muestraRegla, probarReglaAhora } from "../../reglasAcciones";
import {
  ACCIONES,
  CONDICIONES,
  GRUPOS,
  OPERADORES,
  VARIABLES,
  tipoDeCondicion,
  type Accion,
  type Condicion,
  type Operador,
  type Regla,
  type Tarifa,
} from "@/lib/reglasCatalogo";

const ENLACES = [
  { valor: "/inicio", es: "Inicio" },
  { valor: "/clases", es: "Clases" },
  { valor: "/tarifas", es: "Tarifas" },
  { valor: "/cuenta", es: "Mi cuenta" },
  { valor: "/tablon", es: "Tablón de anuncios" },
  { valor: "/rutina", es: "Entreno" },
];

type Muestra = { total: number; nombres: string[]; completas: number };

function condicionNueva(): Condicion {
  return { tipo: "dias_ultimo_entreno", operador: "mayor", valor: "14" };
}

function accionNueva(tipo: Accion["tipo"]): Accion {
  if (tipo === "app") return { tipo: "app", titulo: "", texto: "" };
  if (tipo === "correo") return { tipo: "correo", asunto: "", mensaje: "" };
  if (tipo === "clases") return { tipo: "clases", cantidad: 1, servicio: "grupal", nota: "" };
  return { tipo: "tarea", texto: "" };
}

// Palabras entre llaves que se pueden meter en un texto con un toque.
function Variables({ alElegir }: { alElegir: (v: string) => void }) {
  return (
    <div className={estilos.variables} aria-label="Palabras que se sustituyen solas">
      {VARIABLES.map((v) => (
        <button key={v.clave} type="button" className={estilos.variable} title={v.es} onClick={() => alElegir(`{${v.clave}}`)}>
          {`{${v.clave}}`}
        </button>
      ))}
    </div>
  );
}

function FilaCondicion({ c, tarifas, cambiar, quitar }: { c: Condicion; tarifas: Tarifa[]; cambiar: (c: Condicion) => void; quitar: () => void }) {
  const t = tipoDeCondicion(c.tipo);
  const clase = t?.clase ?? "numero";

  function elegirTipo(clave: string) {
    const nuevo = tipoDeCondicion(clave);
    if (!nuevo) return;
    if (nuevo.clase === "numero") cambiar({ tipo: clave, operador: "igual", valor: "" });
    else if (nuevo.clase === "opcion") cambiar({ tipo: clave, operador: "igual", valor: nuevo.opciones?.[0]?.valor ?? "" });
    else cambiar({ tipo: clave, operador: "tiene", valor: nuevo.dinamico === "tarifas" ? (tarifas[0]?.id ?? "") : (nuevo.opciones?.[0]?.valor ?? "") });
  }

  const opciones = t?.dinamico === "tarifas" ? tarifas.map((x) => ({ valor: x.id, es: x.nombre })) : (t?.opciones ?? []);

  return (
    <div className={estilos.condicion}>
      <div className={styles.campo}>
        <label>Tipo de condición</label>
        <select value={c.tipo} onChange={(e) => elegirTipo(e.target.value)} aria-label="Tipo de condición">
          {GRUPOS.map((g) => (
            <optgroup key={g} label={g}>
              {CONDICIONES.filter((x) => x.grupo === g).map((x) => (
                <option key={x.clave} value={x.clave}>
                  {x.es}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label>Operador</label>
        <select value={c.operador} onChange={(e) => cambiar({ ...c, operador: e.target.value as Operador })} aria-label="Operador">
          {OPERADORES[clase].map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.es}
            </option>
          ))}
        </select>
      </div>
      {clase === "numero" && c.operador !== "vacio" && (
        <div className={styles.campo}>
          <label>{c.operador === "entre" ? "Desde" : "Valor"}{t?.unidad ? ` (${t.unidad})` : ""}</label>
          <input type="number" inputMode="numeric" value={c.valor} onChange={(e) => cambiar({ ...c, valor: e.target.value })} aria-label="Valor" />
        </div>
      )}
      {clase === "numero" && c.operador === "entre" && (
        <div className={styles.campo}>
          <label>Hasta</label>
          <input type="number" inputMode="numeric" value={c.valor2 ?? ""} onChange={(e) => cambiar({ ...c, valor2: e.target.value })} aria-label="Valor final" />
        </div>
      )}
      {clase !== "numero" && (
        <div className={styles.campo}>
          <label>Valor</label>
          <select value={c.valor} onChange={(e) => cambiar({ ...c, valor: e.target.value })} aria-label="Valor">
            {opciones.length === 0 && <option value="">(no hay opciones)</option>}
            {opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.es}
              </option>
            ))}
          </select>
        </div>
      )}
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={quitar}>
        Quitar
      </button>
    </div>
  );
}

function FilaAccion({ a, cambiar, quitar }: { a: Accion; cambiar: (a: Accion) => void; quitar: () => void }) {
  const info = ACCIONES.find((x) => x.tipo === a.tipo);
  return (
    <div className={estilos.accion}>
      <div className={styles.campo}>
        <label>Tipo de consecuencia</label>
        <select value={a.tipo} onChange={(e) => cambiar(accionNueva(e.target.value as Accion["tipo"]))} aria-label="Tipo de consecuencia">
          {ACCIONES.map((x) => (
            <option key={x.tipo} value={x.tipo}>
              {x.es}
            </option>
          ))}
        </select>
        <span className={styles.ayuda}>{info?.ayuda}</span>
      </div>

      {a.tipo === "app" && (
        <>
          <div className={styles.campo}>
            <label>Título del aviso</label>
            <input aria-label="Título del aviso" value={a.titulo} maxLength={120} onChange={(e) => cambiar({ ...a, titulo: e.target.value })} />
          </div>
          <div className={styles.campo}>
            <label>Texto</label>
            <textarea aria-label="Texto del aviso" rows={3} maxLength={300} value={a.texto} onChange={(e) => cambiar({ ...a, texto: e.target.value })} />
            <Variables alElegir={(v) => cambiar({ ...a, texto: `${a.texto}${v}` })} />
          </div>
          <div className={styles.campo}>
            <label>Al pulsarlo lleva a</label>
            <select aria-label="Al pulsarlo lleva a" value={a.enlace ?? "/inicio"} onChange={(e) => cambiar({ ...a, enlace: e.target.value })}>
              {ENLACES.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.es}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {a.tipo === "correo" && (
        <>
          <div className={styles.campo}>
            <label>Asunto</label>
            <input aria-label="Asunto del correo" value={a.asunto} maxLength={150} onChange={(e) => cambiar({ ...a, asunto: e.target.value })} />
          </div>
          <div className={styles.campo}>
            <label>Mensaje</label>
            <textarea aria-label="Mensaje del correo" rows={6} maxLength={3000} value={a.mensaje} onChange={(e) => cambiar({ ...a, mensaje: e.target.value })} />
            <Variables alElegir={(v) => cambiar({ ...a, mensaje: `${a.mensaje}${v}` })} />
            <span className={styles.ayuda}>Una línea en blanco separa párrafos.</span>
          </div>
          <details className={styles.detalles}>
            <summary>Versión en inglés (opcional, para quien usa la app en inglés)</summary>
            <div className={styles.campo}>
              <label>Asunto (inglés)</label>
              <input aria-label="Asunto del correo en inglés" value={a.asunto_en ?? ""} maxLength={150} onChange={(e) => cambiar({ ...a, asunto_en: e.target.value })} />
            </div>
            <div className={styles.campo}>
              <label>Mensaje (inglés)</label>
              <textarea aria-label="Mensaje del correo en inglés" rows={5} maxLength={3000} value={a.mensaje_en ?? ""} onChange={(e) => cambiar({ ...a, mensaje_en: e.target.value })} />
            </div>
          </details>
          <div className={styles.campo}>
            <label>El botón del correo lleva a</label>
            <select aria-label="El botón del correo lleva a" value={a.enlace ?? "/inicio"} onChange={(e) => cambiar({ ...a, enlace: e.target.value })}>
              {ENLACES.map((x) => (
                <option key={x.valor} value={x.valor}>
                  {x.es}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {a.tipo === "clases" && (
        <>
          <div className={styles.campo}>
            <label>Cuántas clases</label>
            <input aria-label="Cuántas clases" type="number" min={1} max={20} value={a.cantidad} onChange={(e) => cambiar({ ...a, cantidad: Number(e.target.value) })} />
          </div>
          <div className={styles.campo}>
            <label>De qué tipo</label>
            <select aria-label="Tipo de clases" value={a.servicio} onChange={(e) => cambiar({ ...a, servicio: e.target.value as "grupal" | "individual" })}>
              <option value="grupal">Clases grupales</option>
              <option value="individual">Clases individuales</option>
            </select>
          </div>
          <div className={styles.campo}>
            <label>Motivo (opcional, queda anotado)</label>
            <input aria-label="Motivo" value={a.nota ?? ""} maxLength={100} onChange={(e) => cambiar({ ...a, nota: e.target.value })} />
          </div>
          <p className={styles.aviso}>Se suman como clases sueltas, sin caducidad. Si quieres avisarle, añade además un aviso o un correo.</p>
        </>
      )}

      {a.tipo === "tarea" && (
        <div className={styles.campo}>
          <label>Mensaje que se te deja preparado en WhatsApp</label>
          <textarea aria-label="Mensaje de WhatsApp" rows={4} maxLength={300} value={a.texto} onChange={(e) => cambiar({ ...a, texto: e.target.value })} />
          <Variables alElegir={(v) => cambiar({ ...a, texto: `${a.texto}${v}` })} />
        </div>
      )}

      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={quitar}>
        Quitar esta consecuencia
      </button>
    </div>
  );
}

export default function EditorRegla({ regla, tarifas }: { regla: Regla | null; tarifas: Tarifa[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(regla?.nombre ?? "");
  const [activa, setActiva] = useState(regla?.activa ?? false);
  const [condiciones, setCondiciones] = useState<Condicion[]>(regla?.condiciones ?? [condicionNueva()]);
  const [acciones, setAcciones] = useState<Accion[]>(regla?.acciones ?? [accionNueva("app")]);
  const [repite, setRepite] = useState(regla?.repeticion_dias != null);
  const [dias, setDias] = useState(String(regla?.repeticion_dias ?? 30));
  const [muestra, setMuestra] = useState<Muestra | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  // «Ahora mismo cumplen X personas»: se recalcula un momento después de tocar las condiciones.
  const clave = JSON.stringify(condiciones);
  useEffect(() => {
    let vigente = true;
    const t = setTimeout(() => {
      muestraRegla(JSON.parse(clave)).then((m) => vigente && setMuestra(m));
    }, 600);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [clave]);

  const datos = () => ({ nombre, condiciones, acciones, repeticion_dias: repite ? Number(dias) : null });

  async function guardar() {
    setTrabajando(true);
    setMensaje(null);
    const r = await guardarRegla(regla?.id ?? null, datos(), activa);
    setTrabajando(false);
    if (!r.ok) return setMensaje({ texto: r.error ?? "No se ha podido guardar.", error: true });
    if (!regla && r.id) router.replace(`/admin/automatizaciones/regla/${r.id}`);
    else router.refresh();
    setMensaje({ texto: r.mensaje ?? "Guardado.", error: false });
  }

  async function probar() {
    if (!regla) return;
    setTrabajando(true);
    setMensaje(null);
    const r = await probarReglaAhora(regla.id);
    setTrabajando(false);
    setMensaje({ texto: r.error ?? r.mensaje ?? "", error: !r.ok });
  }

  async function ejecutar() {
    if (!regla) return;
    const n = muestra?.total ?? 0;
    if (!window.confirm(`Se aplicará ahora a las personas que la cumplen (${n}) y que todavía no la han recibido. ¿Seguro?`)) return;
    setTrabajando(true);
    setMensaje(null);
    const r = await ejecutarReglaAhora(regla.id);
    setTrabajando(false);
    setMensaje({ texto: r.error ?? r.mensaje ?? "", error: !r.ok });
  }

  async function borrar() {
    if (!regla || !window.confirm("¿Eliminar esta automatización? No se puede deshacer (lo ya enviado se queda enviado).")) return;
    setTrabajando(true);
    const r = await eliminarRegla(regla.id);
    setTrabajando(false);
    if (!r.ok) return setMensaje({ texto: r.error ?? "No se ha podido eliminar.", error: true });
    router.push("/admin/automatizaciones");
  }

  return (
    <div className={estilos.editor}>
      <section className={styles.tarjeta}>
        <div className={styles.campo}>
          <label htmlFor="regla-nombre">Nombre de la automatización</label>
          <input id="regla-nombre" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Aviso a quien lleva 3 semanas sin venir" />
        </div>
        <label className={styles.casilla}>
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          <span>Activada (se aplica sola cada mañana)</span>
        </label>
      </section>

      <section className={styles.tarjeta}>
        <h2 className={estilos.paso}>
          <span className={estilos.numero}>1</span> Cuando ocurra
        </h2>
        <p className={styles.ayuda}>Debe cumplirse todo lo que pongas aquí a la vez.</p>
        {condiciones.map((c, i) => (
          <FilaCondicion
            key={i}
            c={c}
            tarifas={tarifas}
            cambiar={(n) => setCondiciones((l) => l.map((x, j) => (j === i ? n : x)))}
            quitar={() => setCondiciones((l) => l.filter((_, j) => j !== i))}
          />
        ))}
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setCondiciones((l) => [...l, condicionNueva()])} disabled={condiciones.length >= 10}>
          + Añadir otra condición
        </button>
        <p className={estilos.previa}>
          {condiciones.length === 0
            ? "Añade al menos una condición."
            : muestra === null
              ? "Calculando a quién afectaría…"
              : muestra.completas !== condiciones.length
                ? "Termina todas las condiciones para ver a quién afectaría."
                : muestra.total === 0
                  ? "Ahora mismo no la cumple nadie."
                  : `Ahora mismo la cumplen ${muestra.total} ${muestra.total === 1 ? "persona" : "personas"}: ${muestra.nombres.join(", ")}${muestra.total > muestra.nombres.length ? "…" : ""}.`}
        </p>
      </section>

      <section className={styles.tarjeta}>
        <h2 className={estilos.paso}>
          <span className={estilos.numero}>2</span> Entonces que haga
        </h2>
        <p className={styles.ayuda}>Se hace todo, en este orden, a cada persona que cumpla la condición.</p>
        {acciones.map((a, i) => (
          <FilaAccion key={i} a={a} cambiar={(n) => setAcciones((l) => l.map((x, j) => (j === i ? n : x)))} quitar={() => setAcciones((l) => l.filter((_, j) => j !== i))} />
        ))}
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAcciones((l) => [...l, accionNueva("app")])} disabled={acciones.length >= 6}>
          + Añadir otra consecuencia
        </button>
      </section>

      <section className={styles.tarjeta}>
        <h2 className={estilos.paso}>
          <span className={estilos.numero}>3</span> Cada cuánto
        </h2>
        <label className={styles.casilla}>
          <input type="radio" name="repite" checked={!repite} onChange={() => setRepite(false)} />
          <span>Una sola vez por persona</span>
        </label>
        <label className={styles.casilla}>
          <input type="radio" name="repite" checked={repite} onChange={() => setRepite(true)} />
          <span>Otra vez, pasados unos días, si sigue cumpliéndose</span>
        </label>
        {repite && (
          <div className={styles.campo}>
            <label htmlFor="regla-dias">Cada cuántos días</label>
            <input id="regla-dias" type="number" min={1} max={365} value={dias} onChange={(e) => setDias(e.target.value)} />
          </div>
        )}
      </section>

      <div className={estilos.botonera}>
        <button type="button" className={styles.boton} onClick={guardar} disabled={trabajando}>
          {trabajando ? "Un momento…" : regla ? "Guardar cambios" : "Crear automatización"}
        </button>
        {regla && (
          <>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={probar} disabled={trabajando}>
              Probar conmigo
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={ejecutar} disabled={trabajando}>
              Ejecutar ahora
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={borrar} disabled={trabajando}>
              Eliminar
            </button>
          </>
        )}
      </div>
      {regla && <p className={styles.ayuda}>«Probar conmigo» te manda a ti el aviso y el correo con datos de ejemplo (no añade clases ni crea tareas). Guarda antes los cambios. «Ejecutar ahora» la aplica ya a quien la cumple, sin esperar a mañana.</p>}
      {mensaje && (
        <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
