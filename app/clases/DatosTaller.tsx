"use client";

import { useState } from "react";
import { textoDia, textoHora } from "@/lib/fechas";
import { enlaceGoogleCalendar, horaFin, textoDatosTaller, type DatosTaller as Datos } from "@/lib/taller";
import estilos from "./clases.module.css";

const TEXTO = {
  es: { ver: "Ver datos del taller", calendario: "Añadir a Google Calendar", copiar: "Copiar datos", copiado: "¡Copiado!", whatsapp: "Enviar por WhatsApp", lugar: "Lugar", online: "Online", enlace: "Enlace", sinLugar: "Por confirmar" },
  en: { ver: "See workshop details", calendario: "Add to Google Calendar", copiar: "Copy details", copiado: "Copied!", whatsapp: "Send by WhatsApp", lugar: "Place", online: "Online", enlace: "Link", sinLugar: "To be confirmed" },
};

// Datos de un taller (cuándo y dónde) con los botones para guardarlos o mandarlos.
export default function DatosTaller({ taller, idioma }: { taller: Datos; idioma: "es" | "en" }) {
  const tx = TEXTO[idioma];
  const [copiado, setCopiado] = useState(false);
  const texto = textoDatosTaller(taller);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt(tx.copiar, texto);
    }
  }

  return (
    <details className={estilos.datosTaller}>
      <summary>{tx.ver}</summary>
      <p>
        {textoDia(taller.empieza_en, idioma)} · {textoHora(taller.empieza_en)} – {horaFin(taller)} ({taller.duracion_min} min)
      </p>
      {taller.modalidad === "online" ? (
        <p>
          {tx.online}
          {taller.enlace && (
            <>
              {" · "}
              <a href={taller.enlace} target="_blank" rel="noopener noreferrer">
                {tx.enlace}
              </a>
            </>
          )}
        </p>
      ) : (
        <p>
          {tx.lugar}: {taller.ubicacion || tx.sinLugar}
        </p>
      )}
      <div className={estilos.botonesTaller}>
        <a href={enlaceGoogleCalendar(taller)} target="_blank" rel="noopener noreferrer">
          {tx.calendario}
        </a>
        <button type="button" onClick={copiar}>
          {copiado ? tx.copiado : tx.copiar}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
          {tx.whatsapp}
        </a>
      </div>
    </details>
  );
}
