"use client";

import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import BotonFoto from "../fotos/BotonFoto";
import { useEnvio } from "../useEnvio";
import { ESTADOS_CURSO, NIVELES, type Curso } from "@/lib/cursos";
import { guardarCurso } from "./acciones";

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
export function FormularioCurso({ curso, categorias, alTerminar }: { curso?: Curso; categorias: string[]; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarCurso, {});
  const { ref, alEnviar } = useEnvio(accion, estado, !curso);
  const p = curso?.id ?? "nuevo";

  useEffect(() => {
    if (!estado.mensaje || !alTerminar || curso) return;
    const t = setTimeout(alTerminar, 900);
    return () => clearTimeout(t);
  }, [estado, alTerminar, curso]);

  return (
    <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
      {curso && <input type="hidden" name="id" value={curso.id} />}

      <div className={styles.campo}>
        <label htmlFor={`titulo-${p}`}>Título <AyudaI texto="El nombre del curso, tal como lo ve la gente." /></label>
        <input id={`titulo-${p}`} name="titulo" required maxLength={80} defaultValue={curso?.titulo ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`titulo_en-${p}`}>Título en inglés (opcional) <AyudaI texto="El título para quien usa la app en inglés. Si lo dejas vacío, se ve el español." /></label>
        <input id={`titulo_en-${p}`} name="titulo_en" maxLength={80} defaultValue={curso?.titulo_en ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`descripcion-${p}`}>Descripción <AyudaI texto="Qué es el curso y qué se aprende. Sale en su tarjeta." /></label>
        <textarea id={`descripcion-${p}`} name="descripcion" rows={5} maxLength={2000} defaultValue={curso?.descripcion ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`descripcion_en-${p}`}>Descripción en inglés (opcional) <AyudaI texto="La descripción para quien usa la app en inglés. Si la dejas vacía, se ve la de español." /></label>
        <textarea id={`descripcion_en-${p}`} name="descripcion_en" rows={5} maxLength={2000} defaultValue={curso?.descripcion_en ?? ""} />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`categoria-${p}`}>Categoría <AyudaI texto="El tema del curso, por ejemplo Pino, Fuerza o Movilidad. Sirve para filtrar los cursos." /></label>
        <input id={`categoria-${p}`} name="categoria" maxLength={40} list={`categorias-${p}`} defaultValue={curso?.categoria ?? ""} />
        <datalist id={`categorias-${p}`}>
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`nivel-${p}`}>Nivel <AyudaI texto="Para quién es el curso: iniciación, intermedio o avanzado." /></label>
        <select id={`nivel-${p}`} name="nivel" defaultValue={curso?.nivel ?? "iniciacion"}>
          {NIVELES.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`estado-${p}`}>Estado <AyudaI texto="Activo: sale en Cursos actuales. Próximo: sale en Próximos cursos. Oculto: solo lo ves tú." /></label>
        <select id={`estado-${p}`} name="estado" defaultValue={curso?.estado ?? "oculto"}>
          {ESTADOS_CURSO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`precio-${p}`}>Precio en euros <AyudaI texto="Lo que cuesta el curso. Con 0 se muestra como gratis." /></label>
        <input id={`precio-${p}`} name="precio" inputMode="decimal" required defaultValue={curso ? String(curso.precio_centimos / 100) : "0"} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`fecha-${p}`}>Fecha prevista (opcional) <AyudaI texto="El día en que se espera que empiece, para los cursos «Próximos»." /></label>
        <input id={`fecha-${p}`} name="fecha_prevista" type="date" defaultValue={curso?.fecha_prevista ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`enlace-${p}`}>Enlace al curso (opcional) <AyudaI texto="La dirección web del curso (empieza por https://). Al pulsar el curso en Cursos actuales, la persona va ahí." /></label>
        <input id={`enlace-${p}`} name="enlace" inputMode="url" placeholder="https://…" defaultValue={curso?.enlace ?? ""} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`popularidad-${p}`}>Popularidad <AyudaI texto="Un número entero para ordenar: los cursos con número más alto salen antes cuando se ordena por popularidad." /></label>
        <input id={`popularidad-${p}`} name="popularidad" inputMode="numeric" defaultValue={String(curso?.popularidad ?? 0)} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`valoracion-${p}`}>Valoración de 0 a 5 (opcional) <AyudaI texto="La nota media del curso. Se usa para mostrar y ordenar por valoración." /></label>
        <input id={`valoracion-${p}`} name="valoracion" inputMode="decimal" defaultValue={curso?.valoracion === null || curso?.valoracion === undefined ? "" : String(curso.valoracion)} />
      </div>

      {curso && (
        <>
          <strong>Foto del curso</strong>
          <BotonFoto destino="curso" id={curso.id} actual={curso.foto_url} />
        </>
      )}

      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : curso ? "Guardar cambios" : "Crear curso"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}
