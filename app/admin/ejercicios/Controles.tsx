"use client";

import { useActionState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { CATEGORIAS, MEDIDAS } from "@/lib/ejercicios";
import { crearEjercicio, editarEjercicio } from "./acciones";

export type EjercicioForm = {
  id: string;
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  medida: string;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
  activo: boolean;
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

// Formulario para crear (sin ejercicio) o editar (con ejercicio) un ejercicio.
export function FormularioEjercicio({ ejercicio }: { ejercicio?: EjercicioForm }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    ejercicio ? editarEjercicio : crearEjercicio,
    {},
  );
  const p = ejercicio?.id ?? "nuevo";

  return (
    <form action={accion} className={ejercicio ? styles.formularioInterno : styles.tarjeta}>
      {ejercicio ? (
        <input type="hidden" name="id" value={ejercicio.id} />
      ) : (
        <h2>Nuevo ejercicio</h2>
      )}

      <div className={styles.campo}>
        <label htmlFor={`nombre-${p}`}>Nombre</label>
        <input
          id={`nombre-${p}`}
          name="nombre"
          required
          maxLength={80}
          defaultValue={ejercicio?.nombre ?? ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`nombre_en-${p}`}>Nombre en inglés (opcional)</label>
        <input
          id={`nombre_en-${p}`}
          name="nombre_en"
          maxLength={80}
          defaultValue={ejercicio?.nombre_en ?? ""}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`categoria-${p}`}>Categoría</label>
        <select id={`categoria-${p}`} name="categoria" defaultValue={ejercicio?.categoria ?? "otros"}>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`medida-${p}`}>Se mide en</label>
        <select id={`medida-${p}`} name="medida" defaultValue={ejercicio?.medida ?? "repeticiones"}>
          {MEDIDAS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.es}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor={`descripcion-${p}`}>Explicación</label>
        <textarea
          id={`descripcion-${p}`}
          name="descripcion"
          rows={4}
          maxLength={2000}
          defaultValue={ejercicio?.descripcion ?? ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`descripcion_en-${p}`}>Explicación en inglés (opcional)</label>
        <textarea
          id={`descripcion_en-${p}`}
          name="descripcion_en"
          rows={4}
          maxLength={2000}
          defaultValue={ejercicio?.descripcion_en ?? ""}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor={`video-${p}`}>Vídeo (enlace de YouTube o de Google Drive)</label>
        <input
          id={`video-${p}`}
          name="video_url"
          inputMode="url"
          placeholder="https://youtu.be/… o https://drive.google.com/file/d/…"
          defaultValue={ejercicio?.video_url ?? ""}
        />
        <span className={styles.ayuda}>
          En Drive, el archivo debe estar compartido con «cualquiera con el enlace».
        </span>
      </div>

      {ejercicio && (
        <label className={styles.casilla}>
          <input type="checkbox" name="activo" defaultChecked={ejercicio.activo} />
          Activo (si lo desmarcas, no se podrá añadir a rutinas nuevas)
        </label>
      )}

      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : ejercicio ? "Guardar cambios" : "Crear ejercicio"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}
