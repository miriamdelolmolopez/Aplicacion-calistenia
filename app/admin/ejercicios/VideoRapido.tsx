"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VideoEjercicio from "../../VideoEjercicio";
import styles from "../admin.module.css";
import { guardarVideoEjercicio } from "./acciones";

// Poner o cambiar el vídeo de un ejercicio con solo pegar el enlace (YouTube o Google Drive).
// La alumna lo ve dentro de la app al entrenar.
export default function VideoRapido({ id, nombre, actual }: { id: string; nombre: string; actual: string | null }) {
  const router = useRouter();
  const [enlace, setEnlace] = useState(actual ?? "");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function guardar(valor: string) {
    setGuardando(true);
    setMensaje(null);
    const r = await guardarVideoEjercicio(id, valor);
    setGuardando(false);
    if (!r.ok) return setMensaje({ ok: false, texto: r.error ?? "No se ha podido guardar." });
    setEnlace(r.enlace ?? "");
    setMensaje({ ok: true, texto: r.enlace ? "Vídeo guardado. Ya sale en la app." : "Vídeo quitado." });
    router.refresh();
  }

  return (
    <div className={styles.videoRapido}>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAbierto(!abierto)}>
        {actual ? "Cambiar vídeo" : "Poner vídeo"}
      </button>

      {abierto && (
        <div className={styles.videoCaja}>
          <label htmlFor={`vr-${id}`}>Enlace del vídeo de «{nombre}»</label>
          <input
            id={`vr-${id}`}
            inputMode="url"
            value={enlace}
            placeholder="https://youtu.be/… o https://drive.google.com/file/d/…"
            onChange={(e) => setEnlace(e.target.value)}
          />
          <span className={styles.ayuda}>
            Vale YouTube (también «no listado») o Google Drive. En Drive, comparte el archivo con «cualquiera con el enlace».
          </span>
          <div className={styles.apuntadoBotones}>
            <button type="button" className={styles.boton} disabled={guardando || enlace.trim() === ""} onClick={() => guardar(enlace)}>
              {guardando ? "Guardando…" : "Guardar vídeo"}
            </button>
            {actual && (
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={guardando} onClick={() => guardar("")}>
                Quitar vídeo
              </button>
            )}
          </div>
          {mensaje && <p className={mensaje.ok ? styles.aviso : styles.error}>{mensaje.texto}</p>}
          {actual && <VideoEjercicio url={actual} titulo={nombre} />}
        </div>
      )}
    </div>
  );
}
