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

  return (
    <section className={estilos.corcho} aria-label={idioma === "en" ? "Notice board" : "Tablón de anuncios"}>
      <h2 className={estilos.titulo}>{idioma === "en" ? "Notice board" : "Tablón de anuncios"}</h2>
      <div className={estilos.notas}>
        {visibles.map((a) => (
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
                  <div className={estilos.pegatinas} aria-label={idioma === "en" ? "People going" : "Quién se apunta"}>
                    {a.iniciales.map((letra, i) => (
                      <span key={i} className={`${estilos.pegatina} ${estilos["color" + (i % 4)]}`}>
                        {letra}
                      </span>
                    ))}
                  </div>
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
