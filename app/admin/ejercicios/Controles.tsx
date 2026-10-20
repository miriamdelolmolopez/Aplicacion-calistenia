"use client";

import { useActionState, useState } from "react";
import MapaCorporal from "../../MapaCorporal";
import MultiDesplegable from "../MultiDesplegable";
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

  // Músculos elegidos como principales y como secundarios (uno no puede estar en los dos).
  const [principales, setPrincipales] = useState<string[]>(
    () => (ejercicio?.musculos ?? []).filter((m) => m.rol === "principal").map((m) => m.musculo),
  );
  const [secundarios, setSecundarios] = useState<string[]>(
    () => (ejercicio?.musculos ?? []).filter((m) => m.rol === "secundario").map((m) => m.musculo),
  );
  const [elegidosMaterial, setElegidosMaterial] = useState<string[]>(ejercicio?.materiales ?? []);
  const marcados: MusculoDeEjercicio[] = [
    ...principales.map((musculo) => ({ musculo, rol: "principal" })),
    ...secundarios.map((musculo) => ({ musculo, rol: "secundario" })),
  ];
  const opcionesMusculo = MUSCULOS.map((m) => ({ valor: m.valor, etiqueta: m.es }));

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
          Elige al menos uno principal. Los principales se ven con más intensidad que los secundarios.
        </p>
        <MultiDesplegable
          titulo="Principales"
          vacio="Elige uno o varios"
          opciones={opcionesMusculo}
          elegidas={principales}
          alCambiar={(nuevas) => {
            setPrincipales(nuevas);
            setSecundarios((sec) => sec.filter((v) => !nuevas.includes(v)));
          }}
        />
        <MultiDesplegable
          titulo="Secundarios"
          vacio="Elige uno o varios (opcional)"
          opciones={opcionesMusculo.filter((o) => !principales.includes(o.valor))}
          elegidas={secundarios}
          alCambiar={setSecundarios}
        />
        {principales.map((v) => (
          <input key={`p-${v}`} type="hidden" name={`musculo_${v}`} value="principal" />
        ))}
        {secundarios.map((v) => (
          <input key={`s-${v}`} type="hidden" name={`musculo_${v}`} value="secundario" />
        ))}
        <MapaCorporal intensidades={intensidadesDeEjercicio(marcados)} />
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend>Material</legend>
        {materiales.length === 0 && <p className={styles.ayuda}>Todavía no hay material: añade uno abajo.</p>}
        <MultiDesplegable
          titulo="Material"
          vacio="Ninguno o elige uno o varios"
          opciones={materiales.map((mat) => ({ valor: mat.id, etiqueta: mat.nombre }))}
          elegidas={elegidosMaterial}
          alCambiar={setElegidosMaterial}
        />
        {elegidosMaterial.map((id) => (
          <input key={id} type="hidden" name="materiales" value={id} />
        ))}
        <div className={styles.campo}>
          <label htmlFor={`material-otro-${p}`}>Otro material (opcional)</label>
          <input
            id={`material-otro-${p}`}
            name="material_nuevo"
            maxLength={60}
            placeholder="Escribe uno nuevo y se añade a la lista"
          />
        </div>
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
