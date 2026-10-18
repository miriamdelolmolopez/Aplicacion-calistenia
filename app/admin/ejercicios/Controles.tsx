"use client";

import { useActionState, useState } from "react";
import MapaCorporal from "../../MapaCorporal";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import {
  CATEGORIAS,
  MUSCULOS,
  TIPOS,
  intensidadesDeEjercicio,
  type MusculoDeEjercicio,
} from "@/lib/ejercicios";
import { crearEjercicio, crearMaterial, editarEjercicio } from "./acciones";

export type EjercicioForm = {
  id: string;
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  tipo: string;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
  activo: boolean;
  musculos: MusculoDeEjercicio[];
  materiales: string[]; // ids de material
};

export type Material = { id: string; nombre: string };

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
export function FormularioEjercicio({
  ejercicio,
  materiales,
}: {
  ejercicio?: EjercicioForm;
  materiales: Material[];
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(
    ejercicio ? editarEjercicio : crearEjercicio,
    {},
  );
  const p = ejercicio?.id ?? "nuevo";

  // Músculo -> "principal" | "secundario" | "" (se ve el mapa mientras eliges).
  const [roles, setRoles] = useState<Record<string, string>>(() =>
    Object.fromEntries((ejercicio?.musculos ?? []).map((m) => [m.musculo, m.rol])),
  );
  const marcados: MusculoDeEjercicio[] = Object.entries(roles)
    .filter(([, rol]) => rol === "principal" || rol === "secundario")
    .map(([musculo, rol]) => ({ musculo, rol }));

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
        <label htmlFor={`tipo-${p}`}>Tipo de ejercicio</label>
        <select id={`tipo-${p}`} name="tipo" defaultValue={ejercicio?.tipo ?? "repeticiones"}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.es}
            </option>
          ))}
        </select>
        <span className={styles.ayuda}>
          Decide qué anotará el alumno en cada serie (repeticiones, segundos, kilos, metros…).
        </span>
      </div>

      <fieldset className={styles.grupo}>
        <legend>Músculos que trabaja</legend>
        <p className={styles.ayuda}>
          Marca al menos uno principal. Los principales se ven con más intensidad que los
          secundarios.
        </p>
        <div className={styles.musculos}>
          {MUSCULOS.map((m) => (
            <div key={m.valor} className={styles.musculoFila}>
              <label htmlFor={`m-${m.valor}-${p}`}>{m.es}</label>
              <select
                id={`m-${m.valor}-${p}`}
                name={`musculo_${m.valor}`}
                value={roles[m.valor] ?? ""}
                onChange={(e) => setRoles((r) => ({ ...r, [m.valor]: e.target.value }))}
              >
                <option value="">—</option>
                <option value="principal">Principal</option>
                <option value="secundario">Secundario</option>
              </select>
            </div>
          ))}
        </div>
        <MapaCorporal intensidades={intensidadesDeEjercicio(marcados)} />
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend>Material</legend>
        {materiales.length === 0 && <p className={styles.ayuda}>Todavía no hay material.</p>}
        {materiales.map((mat) => (
          <label key={mat.id} className={styles.casilla}>
            <input
              type="checkbox"
              name="materiales"
              value={mat.id}
              defaultChecked={ejercicio?.materiales.includes(mat.id)}
            />
            {mat.nombre}
          </label>
        ))}
      </fieldset>

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

export function FormularioMaterial() {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearMaterial, {});
  return (
    <form action={accion} className={styles.tarjeta}>
      <h2>Añadir material</h2>
      <div className={styles.campo}>
        <label htmlFor="material-nombre">Nombre</label>
        <input id="material-nombre" name="nombre" required maxLength={60} />
      </div>
      <div className={styles.campo}>
        <label htmlFor="material-nombre-en">Nombre en inglés (opcional)</label>
        <input id="material-nombre-en" name="nombre_en" maxLength={60} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Añadir material"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}
