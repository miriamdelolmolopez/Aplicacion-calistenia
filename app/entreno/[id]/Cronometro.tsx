"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./guiado.module.css";

const RETARDOS = [3, 5, 10] as const;

// Un «tic» corto con el mismo audio durante todo el cronómetro. `agudo` marca los últimos segundos de la cuenta atrás.
function crearTic() {
  let ctx: AudioContext | null = null;
  return (agudo = false) => {
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
      osc.frequency.value = agudo ? 1500 : 1100;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (agudo ? 0.12 : 0.04));
    } catch {
      // Sin sonido: no pasa nada.
    }
  };
}

function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function retardoGuardado(): number {
  try {
    const n = Number(localStorage.getItem("retardoCronometro"));
    return (RETARDOS as readonly number[]).includes(n) ? n : 5;
  } catch {
    return 5;
  }
}

// Cronómetro de un ejercicio de tiempo. Antes de empezar hay una cuenta atrás (3, 5 o 10 s)
// para dejar el móvil y ponerse en posición. Al parar apunta los segundos hechos.
export default function Cronometro({
  sonido,
  alCambiarSonido,
  textos,
  alParar,
}: {
  sonido: boolean;
  alCambiarSonido: () => void;
  textos: {
    iniciar: string;
    parar: string;
    reiniciar: string;
    sonido: string;
    sinSonido: string;
    cancelar: string;
    retardo: string;
    prepararse: string;
  };
  alParar: (segundos: number | null) => void;
}) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [acumulado, setAcumulado] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [retardo, setRetardo] = useState<number>(retardoGuardado);
  const [cuentaFin, setCuentaFin] = useState<number | null>(null);
  const [cuentaRestante, setCuentaRestante] = useState(0);
  const ultimoSegundo = useRef(-1);
  const tic = useRef(crearTic());
  const sonidoRef = useRef(sonido);
  useEffect(() => {
    sonidoRef.current = sonido;
  }, [sonido]);

  // Cuenta atrás previa: al llegar a cero arranca el cronómetro solo.
  useEffect(() => {
    if (cuentaFin === null) return;
    let ultimo = -1;
    const intervalo = setInterval(() => {
      const ahoraMs = Date.now();
      const restante = Math.max(0, Math.ceil((cuentaFin - ahoraMs) / 1000));
      if (restante !== ultimo) {
        ultimo = restante;
        setCuentaRestante(restante);
        if (sonidoRef.current && restante > 0) tic.current(restante <= 3);
      }
      if (ahoraMs >= cuentaFin) {
        ultimoSegundo.current = -1;
        setAhora(ahoraMs);
        setInicio(ahoraMs);
        setCuentaFin(null);
        if (sonidoRef.current) tic.current(true);
      }
    }, 100);
    return () => clearInterval(intervalo);
  }, [cuentaFin]);

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
  const contando = cuentaFin !== null;

  function elegirRetardo(n: number) {
    setRetardo(n);
    try {
      localStorage.setItem("retardoCronometro", String(n));
    } catch {
      // No pasa nada.
    }
  }

  function iniciar() {
    setCuentaRestante(retardo);
    setCuentaFin(Date.now() + retardo * 1000);
    if (sonidoRef.current) tic.current(false);
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
      {!corriendo && !contando && (
        <div className={estilos.retardo} role="group" aria-label={textos.retardo}>
          <span>{textos.retardo}</span>
          {RETARDOS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={retardo === n}
              className={retardo === n ? estilos.retardoActivo : ""}
              onClick={() => elegirRetardo(n)}
            >
              {n} s
            </button>
          ))}
        </div>
      )}

      {contando ? (
        <>
          <div className={estilos.preparate}>{textos.prepararse}</div>
          <div className={estilos.cuenta} aria-live="polite">
            {cuentaRestante}
          </div>
        </>
      ) : (
        <div className={estilos.cronoTiempo} aria-live="off">
          {mmss(transcurrido)}
        </div>
      )}

      <div className={estilos.cronoBotones}>
        {contando ? (
          <button type="button" onClick={() => setCuentaFin(null)}>
            {textos.cancelar}
          </button>
        ) : corriendo ? (
          <button type="button" className={estilos.cronoParar} onClick={parar}>
            {textos.parar}
          </button>
        ) : (
          <button type="button" className={estilos.cronoIniciar} onClick={iniciar}>
            {textos.iniciar}
          </button>
        )}
        <button type="button" onClick={reiniciar} disabled={corriendo || contando || acumulado === 0}>
          {textos.reiniciar}
        </button>
        <button type="button" aria-pressed={sonido} onClick={alCambiarSonido}>
          {sonido ? `🔊 ${textos.sonido}` : `🔇 ${textos.sinSonido}`}
        </button>
      </div>
    </div>
  );
}
