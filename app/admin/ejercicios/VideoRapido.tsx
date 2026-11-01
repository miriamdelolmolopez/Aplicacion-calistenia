"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VideoEjercicio from "../../VideoEjercicio";
import styles from "../admin.module.css";
import { createClient } from "@/lib/supabase/client";
import { guardarVideoEjercicio, prepararSubidaVideo } from "./acciones";

// Poner o cambiar el vídeo de un ejercicio con solo pegar el enlace (YouTube o Google Drive).
// La alumna lo ve dentro de la app al entrenar.
export default function VideoRapido({ id, nombre, actual }: { id: string; nombre: string; actual: string | null }) {
  const router = useRouter();
  const [enlace, setEnlace] = useState(actual ?? "");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  // Sube un vídeo de tu móvil u ordenador (MP4, WebM o MOV, hasta 50 MB) y lo deja puesto.
  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setMensaje(null);
    if (archivo.size > 50 * 1024 * 1024) return setMensaje({ ok: false, texto: "El vídeo pesa más de 50 MB. Acórtalo o usa un enlace de YouTube." });
    const extension = archivo.name.split(".").pop() ?? "";
    setSubiendo(true);
    const permiso = await prepararSubidaVideo(id, extension);
    if (!permiso.ok || !permiso.ruta || !permiso.token || !permiso.enlace) {
      setSubiendo(false);
      return setMensaje({ ok: false, texto: permiso.error ?? "No se ha podido subir el vídeo." });
    }
    const { error } = await createClient().storage.from("videos").uploadToSignedUrl(permiso.ruta, permiso.token, archivo, { contentType: archivo.type || undefined });
    if (error) {
      setSubiendo(false);
      return setMensaje({ ok: false, texto: "No se ha podido subir el vídeo. Comprueba que es MP4, WebM o MOV y que pesa menos de 50 MB." });
    }
    await guardar(permiso.enlace);
    setSubiendo(false);
  }

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
            Puedes subir un vídeo corto (MP4, WebM o MOV, hasta 50 MB), o pegar un enlace de YouTube («no listado» también vale) o de Google Drive. En Drive, comparte el archivo con «cualquiera con el enlace».
          </span>
          <div className={styles.apuntadoBotones}>
            <label className={`${styles.boton} ${styles.botonSecundario}`} style={{ cursor: subiendo ? "default" : "pointer" }}>
              {subiendo ? "Subiendo vídeo…" : "Subir un vídeo (hasta 50 MB)"}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden disabled={subiendo || guardando} onChange={subir} />
            </label>
            <button type="button" className={styles.boton} disabled={guardando || subiendo || enlace.trim() === ""} onClick={() => guardar(enlace)}>
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
