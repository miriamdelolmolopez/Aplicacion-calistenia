"use client";

import { useEffect } from "react";
import sheet from "../clases/saberMas.module.css";
import estilos from "./academia.module.css";
import { textosAcademia } from "./textosAcademia";
import { nombreNivel, textoPrecio, type Curso } from "@/lib/cursos";
import { fechaCorta } from "@/lib/fechas";

const fondo = (url: string | null) =>
  url ? `url("${url}")` : "linear-gradient(to top, rgba(30,30,28,0.35), rgba(30,30,28,0.05)), url(/fotos/pino.jpg)";

const titulo = (c: Curso, idioma: "es" | "en") => (idioma === "en" && c.titulo_en) || c.titulo;

// Tarjeta del curso en la lista: foto, nombre, nivel y precio.
export function TarjetaCurso({
  curso,
  idioma,
  mostrarFecha = false,
  alPulsar,
}: {
  curso: Curso;
  idioma: "es" | "en";
  mostrarFecha?: boolean;
  alPulsar: () => void;
}) {
  const t = textosAcademia[idioma];
  return (
    <button type="button" className={estilos.tarjeta} onClick={alPulsar}>
      <span className={estilos.foto} style={{ backgroundImage: fondo(curso.foto_url) }} />
      <span className={estilos.cuerpo}>
        <strong>{titulo(curso, idioma)}</strong>
        <span>
          {nombreNivel(curso.nivel, idioma)}
          {curso.categoria ? ` · ${curso.categoria}` : ""}
        </span>
        {mostrarFecha && curso.fecha_prevista ? (
          <span>
            {t.prevista}: {fechaCorta(`${curso.fecha_prevista}T12:00:00Z`, idioma)}
          </span>
        ) : (
          <span className={estilos.precio}>{textoPrecio(curso.precio_centimos, idioma)}</span>
        )}
      </span>
      <span className={estilos.flecha} aria-hidden="true">
        ›
      </span>
    </button>
  );
}

// Panel que se desliza desde abajo con los datos del curso. No cambia de pantalla.
export function DetalleCurso({ curso, idioma, alCerrar }: { curso: Curso; idioma: "es" | "en"; alCerrar: () => void }) {
  const t = textosAcademia[idioma];

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [alCerrar]);

  const descripcion = (idioma === "en" && curso.descripcion_en) || curso.descripcion;

  return (
    <div className={sheet.capa} onClick={alCerrar}>
      <div className={sheet.panel} role="dialog" aria-modal="true" aria-label={titulo(curso, idioma)} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={sheet.cerrar} aria-label={t.cerrar} onClick={alCerrar}>
          ✕
        </button>
        <h2>{titulo(curso, idioma)}</h2>
        <div className={estilos.detalleFoto} style={{ backgroundImage: fondo(curso.foto_url) }} />
        <div className={estilos.meta}>
          <span>{nombreNivel(curso.nivel, idioma)}</span>
          {curso.categoria && <span>{curso.categoria}</span>}
          <span>{textoPrecio(curso.precio_centimos, idioma)}</span>
          {curso.estado === "proximo" && curso.fecha_prevista && (
            <span>
              {t.prevista}: {fechaCorta(`${curso.fecha_prevista}T12:00:00Z`, idioma)}
            </span>
          )}
        </div>
        {(descripcion ?? "")
          .split(/\n+/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        {!descripcion && <p>{t.sinDescripcion}</p>}
        {curso.enlace ? (
          <a href={curso.enlace} target="_blank" rel="noopener noreferrer" className={estilos.enlaceCurso}>
            {t.irAlCurso}
          </a>
        ) : (
          <p>{t.sinEnlace}</p>
        )}
      </div>
    </div>
  );
}
