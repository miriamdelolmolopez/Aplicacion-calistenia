"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bloques } from "../../legal/PaginaLegal";
import estiloLegal from "../../legal/legal.module.css";
import styles from "../admin.module.css";
import { analizarTexto } from "@/lib/legalTexto";
import { guardarTextoLegal } from "./acciones";

// Editor de un texto legal: escribes a la izquierda y ves cómo queda; guardas sin avisar o publicas versión nueva.
export default function EditorLegal({
  documento,
  inicial,
  pideAceptacion,
}: {
  documento: string;
  inicial: string;
  pideAceptacion: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const { intro, secciones } = analizarTexto(texto);
  const cambiado = texto.trim() !== inicial.trim();

  async function guardar(modo: "menor" | "nueva") {
    if (modo === "nueva" && !confirm("Se publicará una versión nueva y TODAS las personas tendrán que aceptarla para seguir usando la app. ¿Seguro?")) return;
    setTrabajando(true);
    setMensaje(null);
    const r = await guardarTextoLegal(documento, texto, modo);
    setTrabajando(false);
    setMensaje({ texto: r.error ?? r.mensaje ?? "", error: !r.ok });
    if (r.ok) router.refresh();
  }

  return (
    <>
      <section className={styles.tarjeta}>
        <h2>Texto</h2>
        <p className={styles.ayuda}>
          Cómo se escribe: una línea que empieza por <code>## </code> es el título de un apartado; una línea en blanco separa párrafos; una línea que
          empieza por <code>- </code> es un punto de una lista.
        </p>
        <div className={styles.campo}>
          <label htmlFor="texto-legal">Contenido</label>
          <textarea
            id="texto-legal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={22}
            style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.85rem", lineHeight: 1.5 }}
          />
        </div>
        <button type="button" className={styles.boton} disabled={trabajando || !cambiado} onClick={() => guardar("menor")}>
          {trabajando ? "Guardando…" : "Guardar cambios (sin pedir que se acepte de nuevo)"}
        </button>
        {pideAceptacion && (
          <>
            <p className={styles.ayuda}>
              Si el cambio es importante (por ejemplo, nuevas condiciones o nuevos datos que se recogen), publica una versión nueva: todas las
              personas tendrán que aceptarla otra vez.
            </p>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando || !cambiado} onClick={() => guardar("nueva")}>
              Publicar versión nueva y pedir que todas la acepten
            </button>
          </>
        )}
        {!cambiado && <p className={styles.ayuda}>No has cambiado nada todavía.</p>}
        {mensaje && (
          <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
            {mensaje.texto}
          </p>
        )}
      </section>

      <section className={styles.tarjeta}>
        <h2>Así se verá</h2>
        <div className={estiloLegal.tarjeta}>
          <Bloques bloques={intro} />
          {secciones.map((s) => (
            <section key={s.titulo}>
              <h2>{s.titulo}</h2>
              <Bloques bloques={s.bloques} />
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
