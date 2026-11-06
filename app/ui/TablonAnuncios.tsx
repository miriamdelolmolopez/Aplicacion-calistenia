"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fechaCorta } from "@/lib/fechas";
import { obtenerAnuncios, type AnuncioFila } from "../tablon/acciones";
import { useIdioma } from "../useIdioma";
import estilos from "./tablon.module.css";

// Tablón de anuncios: notas pegadas en un corcho. Con `limite` enseña solo las últimas y un enlace a todas.
export default function TablonAnuncios({ limite }: { limite?: number }) {
  const [idioma] = useIdioma();
  const [anuncios, setAnuncios] = useState<AnuncioFila[] | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerAnuncios(limite ? limite + 1 : 50)
      .then((a) => vigente && setAnuncios(a))
      .catch(() => vigente && setAnuncios([]));
    return () => {
      vigente = false;
    };
  }, [limite]);

  if (anuncios === null) return null;
  if (anuncios.length === 0) {
    return limite ? null : <p className={estilos.vacio}>{idioma === "en" ? "There are no notices right now." : "Ahora mismo no hay anuncios."}</p>;
  }
  const visibles = limite ? anuncios.slice(0, limite) : anuncios;

  return (
    <section className={estilos.corcho} aria-label={idioma === "en" ? "Notice board" : "Tablón de anuncios"}>
      <h2 className={estilos.titulo}>{idioma === "en" ? "Notice board" : "Tablón de anuncios"}</h2>
      <div className={estilos.notas}>
        {visibles.map((a, n) => (
          <article key={a.id} className={`${estilos.nota} ${n % 2 === 0 ? estilos.giraIzq : estilos.giraDer}`}>
            <span className={estilos.chincheta} aria-hidden="true" />
            {a.fijado && <small className={estilos.fijado}>{idioma === "en" ? "Pinned" : "Fijado"}</small>}
            <h3>{a.titulo}</h3>
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
