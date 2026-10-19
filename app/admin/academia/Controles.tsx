"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import BotonFoto from "../fotos/BotonFoto";
import { ESTADOS_CURSO, NIVELES, type Curso } from "@/lib/cursos";
import { borrarCurso, guardarCurso } from "./acciones";

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

// Formulario para crear un curso (sin curso) o cambiar uno (con curso).
export function FormularioCurso({ curso, categorias }: { curso?: Curso; categorias: string[] }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarCurso, {});
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const p = curso?.id ?? "nuevo";

  async function borrar() {
    if (!curso || !confirm(`¿Borrar el curso «${curso.titulo}»? No se puede deshacer.`)) return;
    setBorrando(true);
    const r = await borrarCurso(curso.id);
    setBorrando(false);
    if (!r.ok) return setErrorBorrar(r.error ?? "No se ha podido borrar.");
    router.refresh();
  }

  return (
    <form action={accion} className={curso ? styles.formularioInterno : styles.tarjeta}>
      {curso ? <input type="hidden" name="id" value={curso.id} /> : <h2>Nuevo curso</h2>}

      <div className={styles.campo}>
        <label htmlFor={`titulo-${p}`}>Título</label>
        <input id={`titulo-${p}`} name="titulo" required maxLength={80} defaultValue={curso?.titulo ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`titulo_en-${p}`}>Título en inglés (opcional)</label>
        <input id={`titulo_en-${p}`} name="titulo_en" maxLength={80} defaultValue={curso?.titulo_en ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`descripcion-${p}`}>Descripción</label>
        <textarea id={`descripcion-${p}`} name="descripcion" rows={5} maxLength={2000} defaultValue={curso?.descripcion ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`descripcion_en-${p}`}>Descripción en inglés (opcional)</label>
        <textarea id={`descripcion_en-${p}`} name="descripcion_en" rows={5} maxLength={2000} defaultValue={curso?.descripcion_en ?? ""} />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`categoria-${p}`}>Categoría (por ejemplo Pino, Fuerza, Movilidad)</label>
        <input id={`categoria-${p}`} name="categoria" maxLength={40} list={`categorias-${p}`} defaultValue={curso?.categoria ?? ""} />
        <datalist id={`categorias-${p}`}>
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`nivel-${p}`}>Nivel</label>
        <select id={`nivel-${p}`} name="nivel" defaultValue={curso?.nivel ?? "iniciacion"}>
          {NIVELES.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`estado-${p}`}>Estado</label>
        <select id={`estado-${p}`} name="estado" defaultValue={curso?.estado ?? "oculto"}>
          {ESTADOS_CURSO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`precio-${p}`}>Precio en euros (0 = gratis)</label>
        <input id={`precio-${p}`} name="precio" inputMode="decimal" required defaultValue={curso ? String(curso.precio_centimos / 100) : "0"} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`fecha-${p}`}>Fecha prevista (para los próximos cursos, opcional)</label>
        <input id={`fecha-${p}`} name="fecha_prevista" type="date" defaultValue={curso?.fecha_prevista ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`enlace-${p}`}>Enlace al curso (https://…, opcional)</label>
        <input id={`enlace-${p}`} name="enlace" inputMode="url" placeholder="https://…" defaultValue={curso?.enlace ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`popularidad-${p}`}>Popularidad (número, para ordenar)</label>
        <input id={`popularidad-${p}`} name="popularidad" inputMode="numeric" defaultValue={String(curso?.popularidad ?? 0)} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`valoracion-${p}`}>Valoración de 0 a 5 (opcional)</label>
        <input id={`valoracion-${p}`} name="valoracion" inputMode="decimal" defaultValue={curso?.valoracion === null || curso?.valoracion === undefined ? "" : String(curso.valoracion)} />
      </div>

      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : curso ? "Guardar cambios" : "Crear curso"}
      </button>
      <Mensajes estado={estado} />

      {curso && (
        <>
          <strong>Foto del curso</strong>
          <BotonFoto destino="curso" id={curso.id} actual={curso.foto_url} />
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={borrando} onClick={borrar}>
            {borrando ? "Borrando…" : "Borrar curso"}
          </button>
          {errorBorrar && <p className={styles.error}>{errorBorrar}</p>}
        </>
      )}
    </form>
  );
}
