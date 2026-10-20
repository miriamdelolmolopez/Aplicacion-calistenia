"use client";

import { useState } from "react";
import estilos from "./confirmada.module.css";
import { textos } from "../textos";
import { descargarIcs, enlaceGoogleCalendar, LUGAR_CLASES } from "@/lib/calendario";
import { textoDia, textoHora } from "@/lib/fechas";

export type ClaseConfirmada = { id: string; tipo: string; empieza_en: string; duracion_min: number };

// Pantalla que sale al reservar: confirma la clase y deja añadirla al calendario.
export default function ReservaConfirmada({
  clase,
  idioma,
  alVer,
  alVolver,
}: {
  clase: ClaseConfirmada;
  idioma: "es" | "en";
  alVer: () => void;
  alVolver: () => void;
}) {
  const t = textos[idioma];
  const [eligiendo, setEligiendo] = useState(false);

  const duracion = clase.duracion_min || 60;
  const fin = new Date(new Date(clase.empieza_en).getTime() + duracion * 60000).toISOString();
  const evento = {
    id: clase.id,
    titulo: `${clase.tipo} · Miriam del Olmo`,
    inicioIso: clase.empieza_en,
    duracionMin: duracion,
    descripcion: `${t.recuerdaLlegar} ${t.traeAgua}`,
  };

  return (
    <div className={estilos.pantalla} role="dialog" aria-modal="true" aria-label={t.reservaConfirmada}>
      <button type="button" className={estilos.volver} onClick={alVolver}>
        ← {t.volver}
      </button>
      <div className={estilos.contenido}>
        <div className={estilos.check} aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1>{t.reservaConfirmada}</h1>

        <div className={estilos.datos}>
          <strong>{clase.tipo}</strong>
          <span>
            {textoDia(clase.empieza_en, idioma)} · {textoHora(clase.empieza_en)} – {textoHora(fin)}
          </span>
          <span>{LUGAR_CLASES}</span>
        </div>

        <div className={estilos.botones}>
          <button type="button" className={estilos.principal} onClick={alVer}>
            {t.verEnMisReservas}
          </button>
          {!eligiendo ? (
            <button type="button" className={estilos.secundario} onClick={() => setEligiendo(true)}>
              {t.alCalendario}
            </button>
          ) : (
            <div className={estilos.opciones}>
              <button type="button" className={estilos.secundario} onClick={() => descargarIcs(evento)}>
                {t.calendarioMovil}
              </button>
              <button
                type="button"
                className={estilos.secundario}
                onClick={() => window.open(enlaceGoogleCalendar(evento), "_blank", "noopener")}
              >
                {t.calendarioGoogle}
              </button>
            </div>
          )}
        </div>

        <p className={estilos.recuerda}>
          {t.recuerdaLlegar}
          <br />
          {t.traeAgua}
        </p>
      </div>

      <svg className={estilos.hoja} viewBox="0 0 120 180" aria-hidden="true">
        <g fill="none" stroke="#e8602c" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
          <path d="M60 178C58 130 62 80 92 20" />
          <path d="M62 140c-22-4-34-20-36-40 22 2 34 18 36 40Z" fill="#e8602c" fillOpacity="0.16" />
          <path d="M66 110c18-6 28-22 28-42-20 6-30 20-28 42Z" fill="#e8602c" fillOpacity="0.16" />
          <path d="M72 80c-14-8-20-22-18-38 16 8 22 22 18 38Z" fill="#e8602c" fillOpacity="0.16" />
          <path d="M82 52c12-6 18-16 18-30-14 4-20 14-18 30Z" fill="#e8602c" fillOpacity="0.16" />
        </g>
      </svg>
    </div>
  );
}
