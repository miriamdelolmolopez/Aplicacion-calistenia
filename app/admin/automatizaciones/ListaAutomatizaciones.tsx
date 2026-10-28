"use client";

import { useState } from "react";
import styles from "../admin.module.css";
import estilos from "./automatizaciones.module.css";
import { FormularioAutomatizacion, type Auto } from "./Controles";

export type Info = { titulo: string; cuando: string; aQuien: string; queHace: string; variables: string };
export type Envios = { total: number; ultimo: string | null };

// Lista de automatizaciones con buscador y filtro (activadas / apagadas).
export default function ListaAutomatizaciones({ autos, info, envios }: { autos: Auto[]; info: Record<string, Info>; envios: Record<string, Envios> }) {
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "activas" | "apagadas">("todas");

  const buscado = texto.trim().toLowerCase();
  const visibles = autos.filter((a) => {
    const i = info[a.clave];
    if (filtro === "activas" && !a.activa) return false;
    if (filtro === "apagadas" && a.activa) return false;
    if (!buscado) return true;
    return [i.titulo, i.cuando, i.aQuien, i.queHace, a.asunto_es, a.mensaje_es].join(" ").toLowerCase().includes(buscado);
  });

  return (
    <>
      <div className={estilos.filtros}>
        <div className={styles.campo}>
          <label htmlFor="auto-buscar">Buscar</label>
          <input id="auto-buscar" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cumpleaños, bono, prueba…" />
        </div>
        <div className={styles.campo}>
          <label htmlFor="auto-filtro">Mostrar</label>
          <select id="auto-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
            <option value="todas">Todas</option>
            <option value="activas">Solo las activadas</option>
            <option value="apagadas">Solo las apagadas</option>
          </select>
        </div>
      </div>

      {visibles.length === 0 && <p className={estilos.vacio}>Ninguna automatización coincide con lo que has buscado.</p>}
      {visibles.map((a) => (
        <FormularioAutomatizacion key={a.clave} auto={a} info={info[a.clave]} envios={envios[a.clave] ?? { total: 0, ultimo: null }} />
      ))}
    </>
  );
}
