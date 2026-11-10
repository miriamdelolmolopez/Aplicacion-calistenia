"use client";

import { useState } from "react";
import { MAX_VIDEOS, type VideoEjercicio } from "@/lib/videosEjercicio";
import styles from "../admin.module.css";

// Vídeos de un ejercicio: cada uno con su nombre (por ejemplo «Vídeo corto») y su enlace, y un botón para añadir más.
// Se envían al guardar en un campo oculto («videos»).
export default function VideosEditor({ inicial }: { inicial: VideoEjercicio[] }) {
  const [lista, setLista] = useState<VideoEjercicio[]>(inicial.length > 0 ? inicial : [{ nombre: "", url: "" }]);

  const cambiar = (i: number, campo: keyof VideoEjercicio, valor: string) => setLista((l) => l.map((v, j) => (j === i ? { ...v, [campo]: valor } : v)));
  const quitar = (i: number) => setLista((l) => (l.length === 1 ? [{ nombre: "", url: "" }] : l.filter((_, j) => j !== i)));
  const mover = (i: number, d: -1 | 1) =>
    setLista((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const copia = [...l];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  return (
    <div className={styles.campo}>
      <label>Vídeos (enlaces de YouTube o de Google Drive)</label>
      <input type="hidden" name="videos" value={JSON.stringify(lista.filter((v) => v.url.trim() || v.nombre.trim()))} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, border: "1px solid var(--linea)" }}>
            <input
              aria-label={`Nombre del vídeo ${i + 1}`}
              placeholder="Nombre del vídeo (por ejemplo: Vídeo corto, Vídeo largo, Explicación)"
              maxLength={40}
              value={v.nombre}
              onChange={(e) => cambiar(i, "nombre", e.target.value)}
            />
            <input
              aria-label={`Enlace del vídeo ${i + 1}`}
              inputMode="url"
              placeholder="https://youtu.be/… o https://drive.google.com/file/d/…"
              value={v.url}
              onChange={(e) => cambiar(i, "url", e.target.value)}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir el vídeo">
                ↑
              </button>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar el vídeo">
                ↓
              </button>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => quitar(i)}>
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={lista.length >= MAX_VIDEOS} onClick={() => setLista((l) => [...l, { nombre: "", url: "" }])}>
          + Añadir vídeo
        </button>
      </div>
      <span className={styles.ayuda}>
        El primero es el principal y el que se ve primero; el resto se ven con las flechas. En Drive, el archivo debe estar compartido con «cualquiera con el enlace».
      </span>
    </div>
  );
}
