"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./guiado.module.css";

// Un «tic» corto cada segundo, con el mismo audio durante todo el cronómetro.
function crearTic() {
  let ctx: AudioContext | null = null;
  return () => {
    try {
      if (!ctx) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        ctx = new Ctx();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1100;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Sin sonido: no pasa nada.
    }
  };
}

function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Cronómetro de un ejercicio de tiempo: al parar apunta los segundos hechos.
export default function Cronometro({
  sonido,
  alCambiarSonido,
  textos,
  alParar,
}: {
  sonido: boolean;
  alCambiarSonido: () => void;
  textos: { iniciar: string; parar: string; reiniciar: string; sonido: string; sinSonido: string };
  alParar: (segundos: number | null) => void;
}) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [acumulado, setAcumulado] = useState(0);
  const [ahora, setAhora] = useState(0);
  const ultimoSegundo = useRef(-1);
  const tic = useRef(crearTic());
  const sonidoRef = useRef(sonido);
  useEffect(() => {
    sonidoRef.current = sonido;
  }, [sonido]);

  useEffect(() => {
    if (inicio === null) return;
    const intervalo = setInterval(() => {
      const ahoraMs = Date.now();
      setAhora(ahoraMs);
      const segundo = Math.floor(acumulado + (ahoraMs - inicio) / 1000);
      if (segundo !== ultimoSegundo.current) {
        ultimoSegundo.current = segundo;
        if (sonidoRef.current) tic.current();
      }
    }, 200);
    return () => clearInterval(intervalo);
  }, [inicio, acumulado]);

  const transcurrido = acumulado + (inicio !== null && ahora > 0 ? (ahora - inicio) / 1000 : 0);
  const corriendo = inicio !== null;

  function iniciar() {
    ultimoSegundo.current = -1;
    const ahoraMs = Date.now();
    setAhora(ahoraMs);
    setInicio(ahoraMs);
  }

  function parar() {
    if (inicio === null) return;
    const total = acumulado + (Date.now() - inicio) / 1000;
    setAcumulado(total);
    setInicio(null);
    alParar(Math.round(total));
  }

  function reiniciar() {
    setAcumulado(0);
    setInicio(null);
    setAhora(0);
    alParar(null);
  }

  return (
    <div className={estilos.cronometro}>
      <div className={estilos.cronoTiempo} aria-live="off">
        {mmss(transcurrido)}
      </div>
      <div className={estilos.cronoBotones}>
        {corriendo ? (
          <button type="button" className={estilos.cronoParar} onClick={parar}>
            {textos.parar}
          </button>
        ) : (
          <button type="button" className={estilos.cronoIniciar} onClick={iniciar}>
            {textos.iniciar}
          </button>
        )}
        <button type="button" onClick={reiniciar} disabled={corriendo || acumulado === 0}>
          {textos.reiniciar}
        </button>
        <button type="button" aria-pressed={sonido} onClick={alCambiarSonido}>
          {sonido ? `🔊 ${textos.sonido}` : `🔇 ${textos.sinSonido}`}
        </button>
      </div>
    </div>
  );
}
