"use client";

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import estilos from "./comunes.module.css";

// Para que un formulario de dentro pueda cerrar la pantalla por sí solo al guardar (null = no hay pantalla que cerrar).
export const CierrePanel = createContext<(() => void) | null>(null);

// Pantalla completa para crear y para editar. Se guarda con el botón de Guardar del formulario; con Cancelar
// (o Volver, o Escape) no se cambia nada, y si ya habías escrito algo, antes pregunta si quieres descartarlo.
export default function PanelCompleto({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  const [sucio, setSucio] = useState(false);
  const [preguntando, setPreguntando] = useState(false);
  const pregunta = useRef<HTMLDivElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cuando sale el mensaje de «guardado» (un aviso nuevo), lo escrito ya está guardado y no hace falta preguntar al salir.
  useEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;
    const observador = new MutationObserver((cambios) => {
      for (const c of cambios) {
        for (const n of Array.from(c.addedNodes)) {
          if (n instanceof HTMLElement && (n.matches('[role="status"]') || n.querySelector('[role="status"]'))) {
            setSucio(false);
            setPreguntando(false);
            return;
          }
        }
      }
    });
    observador.observe(caja, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, []);

  // La pregunta sale abajo, junto a Cancelar; si el botón de Volver de arriba la provoca, se baja hasta ella.
  useEffect(() => {
    if (preguntando) pregunta.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [preguntando]);

  const pedirCierre = useCallback(() => {
    if (sucio) setPreguntando(true);
    else cerrar();
  }, [sucio, cerrar]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && pedirCierre();
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alPulsar);
    };
  }, [pedirCierre]);

  return (
    <div className={estilos.capa} role="dialog" aria-modal="true" aria-label={titulo}>
      <div ref={contenedor} onInputCapture={() => setSucio(true)} onChangeCapture={() => setSucio(true)}>
        <div className={estilos.cabeza}>
          <button type="button" className={estilos.volver} onClick={pedirCierre}>
            ← Volver
          </button>
          <h2>{titulo}</h2>
        </div>

        <CierrePanel.Provider value={cerrar}>{children}</CierrePanel.Provider>

        <div className={estilos.pie}>
          {preguntando && (
            <div ref={pregunta} className={estilos.descartar} role="alertdialog" aria-label="Cambios sin guardar">
              <strong>Tienes cambios sin guardar.</strong>
              <span>Si sales ahora se pierden. ¿Qué quieres hacer?</span>
              <div>
                <button type="button" className={estilos.si} onClick={cerrar}>
                  Descartar los cambios
                </button>
                <button type="button" className={estilos.guardar} onClick={() => setPreguntando(false)}>
                  Seguir editando
                </button>
              </div>
            </div>
          )}
          <button type="button" className={estilos.cancelar} onClick={pedirCierre}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
