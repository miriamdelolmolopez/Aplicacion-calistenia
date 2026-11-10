"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fechaCorta } from "@/lib/fechas";
import { obtenerAnuncios, responderAnuncio, type AnuncioFila, type Respuesta } from "../tablon/acciones";
import { useIdioma } from "../useIdioma";
import estilos from "./tablon.module.css";

// Tablón de anuncios: notas pegadas en un corcho. Con `limite` enseña solo las últimas y un enlace a todas.
export default function TablonAnuncios({ limite }: { limite?: number }) {
  const [idioma] = useIdioma();
  const [anuncios, setAnuncios] = useState<AnuncioFila[] | null>(null);
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);
  const [verQuien, setVerQuien] = useState<string | null>(null); // anuncio con la lista de nombres abierta
  const [pos, setPos] = useState(0); // qué anuncio se ve (se pasa de uno a otro con las flechas)

  useEffect(() => {
    let vigente = true;
    obtenerAnuncios(limite ? limite + 1 : 50)
      .then((a) => vigente && setAnuncios(a))
      .catch(() => vigente && setAnuncios([]));
    return () => {
      vigente = false;
    };
  }, [limite]);

  async function responder(a: AnuncioFila, nueva: Respuesta) {
    if (!anuncios) return;
    const quitar = a.miRespuesta === nueva; // pulsar otra vez la misma opción la quita
    const r = await responderAnuncio(a.id, quitar ? null : nueva);
    if (!r.ok) {
      setAviso({ id: a.id, texto: r.error === "completo" ? (idioma === "en" ? "No spots left." : "Ya no quedan plazas.") : r.error === "solo_lectura" ? (idioma === "en" ? "Read-only view." : "Vista de solo lectura.") : idioma === "en" ? "Could not save. Try again." : "No se ha podido guardar. Inténtalo de nuevo." });
      return;
    }
    setAviso(null);
    obtenerAnuncios(limite ? limite + 1 : 50).then(setAnuncios).catch(() => {});
  }

  if (anuncios === null) return null;
  if (anuncios.length === 0) {
    return limite ? null : <p className={estilos.vacio}>{idioma === "en" ? "There are no notices right now." : "Ahora mismo no hay anuncios."}</p>;
  }
  const visibles = limite ? anuncios.slice(0, limite) : anuncios;
  const actual = Math.min(pos, visibles.length - 1);
  const en = idioma === "en";

  return (
    <section className={estilos.corcho} aria-label={idioma === "en" ? "Notice board" : "Tablón de anuncios"}>
      <h2 className={estilos.titulo}>{idioma === "en" ? "Notice board" : "Tablón de anuncios"}</h2>
      {visibles.length > 1 && (
        <div className={estilos.flechas}>
          <button type="button" className={estilos.flecha} onClick={() => setPos(Math.max(0, actual - 1))} disabled={actual === 0} aria-label={en ? "Newer notice" : "Anuncio más reciente"}>
            ‹
          </button>
          <span className={estilos.posicion}>
            {fechaCorta(visibles[actual].publicado_en, en ? "en" : "es")} · {actual + 1}/{visibles.length}
          </span>
          <button type="button" className={estilos.flecha} onClick={() => setPos(Math.min(visibles.length - 1, actual + 1))} disabled={actual === visibles.length - 1} aria-label={en ? "Older notice" : "Anuncio anterior"}>
            ›
          </button>
        </div>
      )}
      <div className={estilos.notas}>
        {visibles.filter((_, i) => i === actual).map((a) => (
          <article key={a.id} className={estilos.nota}>
            <span className={estilos.chincheta} aria-hidden="true" />
            {a.fijado && <small className={estilos.fijado}>{idioma === "en" ? "Pinned" : "Fijado"}</small>}
            <h3>{a.titulo}</h3>
            {a.admiteApuntados && (
              <div className={estilos.apuntarse}>
                <div className={estilos.opciones}>
                  {(
                    [
                      ["voy", idioma === "en" ? "I'm in" : "Me apunto"],
                      ["no_puedo", idioma === "en" ? "Can't make it" : "No puedo ir"],
                      ["pensar", idioma === "en" ? "Need to think" : "Necesito pensarlo"],
                    ] as [Respuesta, string][]
                  ).map(([valor, texto]) => (
                    <button key={valor} type="button" aria-pressed={a.miRespuesta === valor} className={`${estilos.opcion} ${a.miRespuesta === valor ? estilos.opcionActiva : ""}`} onClick={() => responder(a, valor)}>
                      {texto}
                    </button>
                  ))}
                </div>
                {aviso?.id === a.id && (
                  <small className={estilos.errorNota} role="alert">
                    {aviso.texto}
                  </small>
                )}
                <small className={estilos.plazas}>
                  {a.maxPlazas
                    ? idioma === "en"
                      ? `${a.voy} of ${a.maxPlazas} spots taken`
                      : `${a.voy} de ${a.maxPlazas} plazas ocupadas`
                    : idioma === "en"
                      ? `${a.voy} going`
                      : `${a.voy} ${a.voy === 1 ? "se apunta" : "se apuntan"}`}
                </small>
                {a.iniciales.length > 0 && (
                  <button type="button" className={estilos.pegatinas} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} aria-expanded={verQuien === a.id} aria-label={idioma === "en" ? "See who is going" : "Ver quién se apunta"} onClick={() => setVerQuien(verQuien === a.id ? null : a.id)}>
                    {a.iniciales.map((letra, i) => (
                      <span key={i} className={`${estilos.pegatina} ${estilos["color" + (i % 4)]}`}>
                        {letra}
                      </span>
                    ))}
                  </button>
                )}
                {verQuien === a.id && a.nombres.length > 0 && (
                  <ul className={estilos.quienes}>
                    {a.nombres.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p>{a.texto}</p>
            {a.enlace && (
              <a href={a.enlace} target={a.enlace.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className={estilos.enlace}>
                {idioma === "en" ? "More info →" : "Más información →"}
              </a>
            )}
            <small className={estilos.fecha}>{fechaCorta(a.publicado_en, idioma === "en" ? "en" : "es")}</small>
          </article>
        ))}
      </div>
      {limite && anuncios.length > limite && (
        <Link href="/tablon" className={estilos.verTodos}>
          {idioma === "en" ? "See all notices →" : "Ver todos los anuncios →"}
        </Link>
      )}
    </section>
  );
}
