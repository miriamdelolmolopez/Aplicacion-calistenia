"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../admin.module.css";
import { activarFrase, borrarFrase, guardarFrase } from "./acciones";

export type Frase = { id: string; texto_es: string; texto_en: string; activa: boolean };

// Lista de frases de motivación de Inicio: añadir, cambiar, desactivar y borrar.
export default function Frases({ frases }: { frases: Frase[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    setError(null);
    const r = await guardarFrase(new FormData(formulario));
    if (!r.ok) return setError(r.error ?? "No se ha podido guardar.");
    formulario.reset();
    setEditando(null);
    router.refresh();
  }

  async function cambiar(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const r = await accion();
    if (!r.ok) return setError(r.error ?? "No se ha podido hacer.");
    router.refresh();
  }

  const formulario = (f?: Frase) => (
    <form key={f?.id ?? "nueva"} onSubmit={guardar} className={styles.formularioInterno}>
      <input type="hidden" name="id" value={f?.id ?? ""} />
      <div className={styles.campo}>
        <label htmlFor={`es-${f?.id ?? "n"}`}>Frase en español</label>
        <input id={`es-${f?.id ?? "n"}`} name="texto_es" maxLength={140} defaultValue={f?.texto_es} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`en-${f?.id ?? "n"}`}>Frase en inglés</label>
        <input id={`en-${f?.id ?? "n"}`} name="texto_en" maxLength={140} defaultValue={f?.texto_en} required />
      </div>
      <button type="submit" className={styles.boton}>
        {f ? "Guardar cambios" : "Añadir frase"}
      </button>
    </form>
  );

  return (
    <section className={styles.tarjeta}>
      <h2>Frases de Inicio ({frases.filter((f) => f.activa).length} activas)</h2>
      <p className={styles.ayuda}>
        Cada vez que una alumna abre la app, sale una de estas frases al azar sobre la foto de Inicio.
      </p>
      <ul className={styles.lista}>
        {frases.map((f) => (
          <li key={f.id} className={styles.persona}>
            {editando === f.id ? (
              formulario(f)
            ) : (
              <>
                <div>
                  <strong style={f.activa ? undefined : { opacity: 0.5 }}>{f.texto_es}</strong>
                  <div className={styles.ayuda}>{f.texto_en}</div>
                </div>
                <div className={styles.apuntadoBotones}>
                  <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setEditando(f.id)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`${styles.boton} ${styles.botonSecundario}`}
                    onClick={() => cambiar(() => activarFrase(f.id, !f.activa))}
                  >
                    {f.activa ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.boton} ${styles.botonSecundario}`}
                    onClick={() => {
                      if (window.confirm("¿Borrar esta frase?")) cambiar(() => borrarFrase(f.id));
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
      {formulario()}
    </section>
  );
}
