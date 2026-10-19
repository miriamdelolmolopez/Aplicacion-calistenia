"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import { borrarContenido, guardarPregunta, guardarSeccion, guardarTermino } from "./acciones";

export type Termino = {
  id: string;
  termino_es: string;
  termino_en: string | null;
  definicion_es: string;
  definicion_en: string | null;
  activo: boolean;
};

export type Seccion = {
  id: string;
  titulo_es: string;
  titulo_en: string | null;
  texto_es: string;
  texto_en: string | null;
  orden: number;
  activo: boolean;
};

export type Pregunta = {
  id: string;
  pregunta_es: string;
  pregunta_en: string | null;
  opciones_es: string[];
  opciones_en: string[] | null;
  correcta: number;
  explicacion_es: string | null;
  explicacion_en: string | null;
  activa: boolean;
};

function Mensajes({ estado }: { estado: Estado }) {
  return (
    <>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </>
  );
}

// Botón «Borrar» con confirmación.
function Borrar({ tabla, id, nombre }: { tabla: "glosario" | "historia" | "preguntas"; id: string; nombre: string }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    if (!confirm(`¿Borrar «${nombre}»? No se puede deshacer.`)) return;
    setTrabajando(true);
    const r = await borrarContenido(tabla, id);
    setTrabajando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido borrar.");
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando} onClick={borrar}>
        {trabajando ? "Borrando…" : "Borrar"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{etiqueta}</label>
      {children}
    </div>
  );
}

export function FormularioTermino({ termino }: { termino?: Termino }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarTermino, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !termino);
  const p = termino?.id ?? "nuevo";
  return (
    <form ref={ref} onSubmit={alEnviar} className={termino ? styles.formularioInterno : styles.tarjeta}>
      {termino ? <input type="hidden" name="id" value={termino.id} /> : <h2>Nuevo término</h2>}
      <Campo id={`te-${p}`} etiqueta="Término">
        <input id={`te-${p}`} name="termino_es" required maxLength={60} defaultValue={termino?.termino_es ?? ""} />
      </Campo>
      <Campo id={`tn-${p}`} etiqueta="Término en inglés (opcional)">
        <input id={`tn-${p}`} name="termino_en" maxLength={60} defaultValue={termino?.termino_en ?? ""} />
      </Campo>
      <Campo id={`de-${p}`} etiqueta="Definición">
        <textarea id={`de-${p}`} name="definicion_es" required rows={4} maxLength={800} defaultValue={termino?.definicion_es ?? ""} />
      </Campo>
      <Campo id={`dn-${p}`} etiqueta="Definición en inglés (opcional)">
        <textarea id={`dn-${p}`} name="definicion_en" rows={4} maxLength={800} defaultValue={termino?.definicion_en ?? ""} />
      </Campo>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={termino?.activo ?? true} />
        Visible para las alumnas
      </label>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : termino ? "Guardar cambios" : "Añadir término"}
      </button>
      <Mensajes estado={estado} />
      {termino && <Borrar tabla="glosario" id={termino.id} nombre={termino.termino_es} />}
    </form>
  );
}

export function FormularioSeccion({ seccion, siguienteOrden }: { seccion?: Seccion; siguienteOrden?: number }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarSeccion, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !seccion);
  const p = seccion?.id ?? "nuevo";
  return (
    <form ref={ref} onSubmit={alEnviar} className={seccion ? styles.formularioInterno : styles.tarjeta}>
      {seccion ? <input type="hidden" name="id" value={seccion.id} /> : <h2>Nuevo apartado</h2>}
      <Campo id={`ti-${p}`} etiqueta="Título">
        <input id={`ti-${p}`} name="titulo_es" required maxLength={80} defaultValue={seccion?.titulo_es ?? ""} />
      </Campo>
      <Campo id={`tin-${p}`} etiqueta="Título en inglés (opcional)">
        <input id={`tin-${p}`} name="titulo_en" maxLength={80} defaultValue={seccion?.titulo_en ?? ""} />
      </Campo>
      <Campo id={`tx-${p}`} etiqueta="Texto (separa los párrafos con una línea en blanco)">
        <textarea id={`tx-${p}`} name="texto_es" required rows={9} maxLength={5000} defaultValue={seccion?.texto_es ?? ""} />
      </Campo>
      <Campo id={`txn-${p}`} etiqueta="Texto en inglés (opcional)">
        <textarea id={`txn-${p}`} name="texto_en" rows={9} maxLength={5000} defaultValue={seccion?.texto_en ?? ""} />
      </Campo>
      <Campo id={`or-${p}`} etiqueta="Orden (1 sale primero)">
        <input id={`or-${p}`} name="orden" inputMode="numeric" defaultValue={String(seccion?.orden ?? siguienteOrden ?? 1)} />
      </Campo>
      <label className={styles.casilla}>
        <input type="checkbox" name="activo" defaultChecked={seccion?.activo ?? true} />
        Visible para las alumnas
      </label>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : seccion ? "Guardar cambios" : "Añadir apartado"}
      </button>
      <Mensajes estado={estado} />
      {seccion && <Borrar tabla="historia" id={seccion.id} nombre={seccion.titulo_es} />}
    </form>
  );
}

export function FormularioPregunta({ pregunta }: { pregunta?: Pregunta }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarPregunta, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !pregunta);
  const p = pregunta?.id ?? "nuevo";
  return (
    <form ref={ref} onSubmit={alEnviar} className={pregunta ? styles.formularioInterno : styles.tarjeta}>
      {pregunta ? <input type="hidden" name="id" value={pregunta.id} /> : <h2>Nueva pregunta</h2>}
      <Campo id={`pe-${p}`} etiqueta="Pregunta">
        <input id={`pe-${p}`} name="pregunta_es" required maxLength={300} defaultValue={pregunta?.pregunta_es ?? ""} />
      </Campo>
      <Campo id={`pn-${p}`} etiqueta="Pregunta en inglés (opcional)">
        <input id={`pn-${p}`} name="pregunta_en" maxLength={300} defaultValue={pregunta?.pregunta_en ?? ""} />
      </Campo>

      <fieldset className={styles.grupo}>
        <legend>Respuestas (marca la correcta)</legend>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={styles.casilla}>
            <input
              type="radio"
              name="correcta"
              value={n - 1}
              aria-label={`La respuesta ${n} es la correcta`}
              defaultChecked={(pregunta?.correcta ?? 0) === n - 1}
            />
            <input
              name={`opcion_es_${n}`}
              required
              maxLength={200}
              aria-label={`Respuesta ${n}`}
              defaultValue={pregunta?.opciones_es[n - 1] ?? ""}
              style={{ flex: 1, minHeight: 44, padding: "0 12px", font: "inherit", borderRadius: 12, border: "1px solid var(--linea)" }}
            />
          </div>
        ))}
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend>Respuestas en inglés (opcional, las 4 en el mismo orden)</legend>
        {[1, 2, 3, 4].map((n) => (
          <input
            key={n}
            name={`opcion_en_${n}`}
            maxLength={200}
            aria-label={`Respuesta ${n} en inglés`}
            defaultValue={pregunta?.opciones_en?.[n - 1] ?? ""}
            style={{ minHeight: 44, padding: "0 12px", font: "inherit", borderRadius: 12, border: "1px solid var(--linea)" }}
          />
        ))}
      </fieldset>

      <Campo id={`ex-${p}`} etiqueta="Explicación (sale al contestar, opcional)">
        <textarea id={`ex-${p}`} name="explicacion_es" rows={3} maxLength={500} defaultValue={pregunta?.explicacion_es ?? ""} />
      </Campo>
      <Campo id={`exn-${p}`} etiqueta="Explicación en inglés (opcional)">
        <textarea id={`exn-${p}`} name="explicacion_en" rows={3} maxLength={500} defaultValue={pregunta?.explicacion_en ?? ""} />
      </Campo>
      <label className={styles.casilla}>
        <input type="checkbox" name="activa" defaultChecked={pregunta?.activa ?? true} />
        Sale en el examen
      </label>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : pregunta ? "Guardar cambios" : "Añadir pregunta"}
      </button>
      <Mensajes estado={estado} />
      {pregunta && <Borrar tabla="preguntas" id={pregunta.id} nombre={pregunta.pregunta_es.slice(0, 40)} />}
    </form>
  );
}
