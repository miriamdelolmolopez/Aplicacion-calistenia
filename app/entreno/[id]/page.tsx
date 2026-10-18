"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../../formularios.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import VideoEjercicio from "../../VideoEjercicio";
import { agregarSerie, finalizarEntreno, guardarSerie, quitarSerie } from "../acciones";
import Cronometro from "./Cronometro";
import estilos from "./guiado.module.css";
import Resumen, { type DatosResumen } from "./Resumen";
import { TIPOS, type Campo } from "@/lib/ejercicios";
import { createClient } from "@/lib/supabase/client";

export type Serie = {
  id: string;
  ejercicio_id: string | null;
  nombre_ejercicio: string;
  tipo: string;
  orden_ejercicio: number;
  numero: number;
  grupo: number | null;
  descanso_seg: number;
  nota_objetivo: string | null;
  obj_reps_min: number | null;
  obj_reps_max: number | null;
  obj_segundos_min: number | null;
  obj_segundos_max: number | null;
  obj_peso_kg: number | null;
  obj_distancia_m: number | null;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  detalle: string | null;
  completada: boolean;
};

type Entreno = {
  id: string;
  nombre_rutina: string;
  nombre_sesion: string;
  estado: string;
  empezado_en: string;
  terminado_en: string | null;
  duracion_seg: number | null;
  resumen: DatosResumen | null;
};

type Anterior = {
  ejercicio_id: string;
  numero: number;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  detalle: string | null;
};

type Datos = {
  entreno: Entreno;
  series: Serie[];
  anteriores: Anterior[];
  ejercicios: Record<string, { video_url: string | null; nombre_en: string | null }>;
};

const CUATRO_HORAS = 4 * 3600;

async function cargar(id: string): Promise<Datos | null> {
  const supabase = createClient();
  const { data: entreno } = await supabase
    .from("entrenos")
    .select("id, nombre_rutina, nombre_sesion, estado, empezado_en, terminado_en, duracion_seg, resumen")
    .eq("id", id)
    .maybeSingle();
  if (!entreno) return null;

  const { data: series } = await supabase
    .from("entreno_series")
    .select("*")
    .eq("entreno_id", id)
    .order("orden_ejercicio")
    .order("numero");

  const lista = (series ?? []) as Serie[];
  const ids = [...new Set(lista.map((s) => s.ejercicio_id).filter((x): x is string => !!x))];
  let anteriores: Anterior[] = [];
  let ejercicios: Datos["ejercicios"] = {};
  if (ids.length > 0 && entreno.estado === "en_curso") {
    const { data } = await supabase.rpc("ultima_vez", { p_ejercicios: ids });
    anteriores = (data ?? []) as Anterior[];
    const { data: ejs } = await supabase.from("ejercicios").select("id, video_url, nombre_en").in("id", ids);
    ejercicios = Object.fromEntries(
      ((ejs ?? []) as { id: string; video_url: string | null; nombre_en: string | null }[]).map((e) => [
        e.id,
        { video_url: e.video_url, nombre_en: e.nombre_en },
      ]),
    );
  }
  return { entreno: entreno as Entreno, series: lista, anteriores, ejercicios };
}

function mmss(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

function aNumero(texto: string): number | null {
  const limpio = texto.replace(",", ".").trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pitido() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.3);
      osc.stop(ctx.currentTime + i * 0.3 + 0.18);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Sin sonido: no pasa nada.
  }
}

// Orden en que se hacen las series: un ejercicio detrás de otro y, en las superseries,
// una vuelta de cada ejercicio (A1, A2, A1, A2…).
function construirSecuencia(series: Serie[]): string[] {
  const ordenes = [...new Set(series.map((s) => s.orden_ejercicio))].sort((a, b) => a - b);
  const secuencia: string[] = [];
  const vistos = new Set<number>();
  for (const o of ordenes) {
    if (vistos.has(o)) continue;
    const grupo = series.find((s) => s.orden_ejercicio === o)?.grupo ?? null;
    if (grupo === null) {
      vistos.add(o);
      series
        .filter((s) => s.orden_ejercicio === o)
        .sort((a, b) => a.numero - b.numero)
        .forEach((s) => secuencia.push(s.id));
      continue;
    }
    const delGrupo = series.filter((s) => s.grupo === grupo);
    const ords = [...new Set(delGrupo.map((s) => s.orden_ejercicio))].sort((a, b) => a - b);
    ords.forEach((x) => vistos.add(x));
    const rondas = Math.max(...delGrupo.map((s) => s.numero));
    for (let n = 1; n <= rondas; n++) {
      for (const x of ords) {
        const s = delGrupo.find((y) => y.orden_ejercicio === x && y.numero === n);
        if (s) secuencia.push(s.id);
      }
    }
  }
  return secuencia;
}

type Descanso = { fin: number; total: number; siguiente: string | null };

export default function PantallaEntreno() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [idioma] = useIdioma();
  const t = textos[idioma];

  const [datos, setDatos] = useState<Datos | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [ahora, setAhora] = useState(0);
  const [descanso, setDescanso] = useState<Descanso | null>(null);
  const [actualId, setActualId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminando, setTerminando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [minutos, setMinutos] = useState("");
  // Se recuerda si el segundero suena (por defecto, sí).
  const [sonido, setSonido] = useState(() => {
    try {
      return localStorage.getItem("sonidoSegundero") !== "no";
    } catch {
      return true;
    }
  });
  const descansoRef = useRef<Descanso | null>(null);

  const mensajeError = useCallback(
    (codigo?: string) => ((t[`err_${codigo}` as keyof typeof t] as string | undefined) ?? t.errorGeneral),
    [t],
  );

  const fijarDescanso = useCallback((d: Descanso | null) => {
    descansoRef.current = d;
    setDescanso(d);
  }, []);

  useEffect(() => {
    cargar(id).then((d) => {
      if (!d) setNoExiste(true);
      else setDatos(d);
    });
  }, [id]);

  function cambiarSonido() {
    const nuevo = !sonido;
    setSonido(nuevo);
    try {
      localStorage.setItem("sonidoSegundero", nuevo ? "si" : "no");
    } catch {
      // No pasa nada.
    }
  }

  // Reloj: se actualiza cada medio segundo; al acabar el descanso avisa y pasa a lo siguiente.
  const enCurso = datos?.entreno.estado === "en_curso";
  useEffect(() => {
    if (!enCurso) return;
    const tic = () => {
      const ahoraMs = Date.now();
      setAhora(ahoraMs);
      const d = descansoRef.current;
      if (d && ahoraMs >= d.fin) {
        pitido();
        navigator.vibrate?.([300, 150, 300]);
        descansoRef.current = null;
        setDescanso(null);
        if (d.siguiente) setActualId(d.siguiente);
      }
    };
    tic();
    const intervalo = setInterval(tic, 500);
    return () => clearInterval(intervalo);
  }, [enCurso]);

  // Mantener la pantalla encendida.
  useEffect(() => {
    if (!enCurso) return;
    let candado: WakeLockSentinel | null = null;
    const pedir = async () => {
      try {
        candado = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Si el móvil no lo permite, seguimos sin él.
      }
    };
    pedir();
    const alVolver = () => {
      if (document.visibilityState === "visible") pedir();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      candado?.release().catch(() => {});
    };
  }, [enCurso]);

  function cambiarSerie(serieId: string, cambios: Partial<Serie>) {
    setDatos((d) =>
      d ? { ...d, series: d.series.map((s) => (s.id === serieId ? { ...s, ...cambios } : s)) } : d,
    );
  }

  async function guardar(s: Serie, cambios: Partial<Serie> = {}) {
    const nueva = { ...s, ...cambios };
    const r = await guardarSerie(s.id, {
      reps: nueva.reps,
      segundos: nueva.segundos,
      peso: nueva.peso_kg,
      distancia: nueva.distancia_m,
      detalle: nueva.detalle ?? "",
      completada: nueva.completada,
    });
    if (!r.ok) {
      setError(mensajeError(r.codigo));
      return false;
    }
    setError(null);
    return true;
  }

  function esFinDeVuelta(s: Serie, todas: Serie[]): boolean {
    if (s.grupo === null) return true;
    const delGrupo = todas.filter((x) => x.grupo === s.grupo);
    return s.orden_ejercicio === Math.max(...delGrupo.map((x) => x.orden_ejercicio));
  }

  async function masSerie(orden: number) {
    const r = await agregarSerie(id, orden);
    if (!r.ok) return setError(mensajeError(r.codigo));
    const nuevo = await cargar(id);
    if (nuevo) setDatos(nuevo);
  }

  async function menosSerie(s: Serie) {
    const r = await quitarSerie(s.id);
    if (!r.ok) return setError(mensajeError(r.codigo));
    const nuevo = await cargar(id);
    if (nuevo) {
      setDatos(nuevo);
      // Si la serie quitada era la de la pantalla, se vuelve a la primera pendiente.
      setActualId(null);
    }
  }

  async function terminar() {
    if (!datos) return;
    setTerminando(true);
    setError(null);
    const transcurrido = (Date.now() - new Date(datos.entreno.empezado_en).getTime()) / 1000;
    let duracion: number | undefined;
    if (transcurrido > CUATRO_HORAS) {
      const m = aNumero(minutos);
      if (m === null || m <= 0 || m * 60 > transcurrido) {
        setTerminando(false);
        return setError(t.err_duracion);
      }
      duracion = m * 60;
    }
    const r = await finalizarEntreno(id, duracion);
    if (!r.ok) {
      setTerminando(false);
      return setError(mensajeError(r.codigo));
    }
    fijarDescanso(null);
    const nuevo = await cargar(id);
    if (nuevo) setDatos(nuevo);
    setTerminando(false);
  }

  if (noExiste) {
    return (
      <main className={styles.pagina}>
        <Link href="/rutina" className={estilos.volver}>
          ← {t.volver}
        </Link>
        <p className={styles.aviso}>{t.entrenoNoEncontrado}</p>
      </main>
    );
  }
  if (!datos) {
    return (
      <main className={styles.pagina}>
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  const { entreno, series, anteriores, ejercicios } = datos;

  if (entreno.estado === "terminado") {
    return (
      <Resumen
        nombreSesion={entreno.nombre_sesion}
        nombreRutina={entreno.nombre_rutina}
        duracionSeg={entreno.duracion_seg ?? 0}
        resumen={entreno.resumen}
        alVolver={() => router.push("/rutina")}
      />
    );
  }
  if (entreno.estado === "descartado") {
    return (
      <main className={styles.pagina}>
        <Link href="/rutina" className={estilos.volver}>
          ← {t.volver}
        </Link>
        <p className={styles.aviso}>{t.entrenoNoEncontrado}</p>
      </main>
    );
  }

  const transcurrido = ahora > 0 ? (ahora - new Date(entreno.empezado_en).getTime()) / 1000 : 0;
  const muyLargo = transcurrido > CUATRO_HORAS;
  const hechas = series.filter((s) => s.completada).length;
  const sinMarcar = series.length - hechas;

  // ---- Qué serie toca ahora ----
  const secuencia = construirSecuencia(series);
  const porId = new Map(series.map((s) => [s.id, s]));
  const primeraPendiente = secuencia.find((sid) => !porId.get(sid)?.completada) ?? null;
  const idActual = actualId && porId.has(actualId) ? actualId : (primeraPendiente ?? secuencia[secuencia.length - 1] ?? null);
  const actual = idActual ? (porId.get(idActual) ?? null) : null;
  const posicion = idActual ? secuencia.indexOf(idActual) : -1;
  const todoHecho = sinMarcar === 0;

  const siguienteDespuesDe = (sid: string): string | null => {
    const i = secuencia.indexOf(sid);
    return (
      secuencia.slice(i + 1).find((x) => !porId.get(x)?.completada) ??
      secuencia.find((x) => x !== sid && !porId.get(x)?.completada) ??
      null
    );
  };

  async function marcarHecha(s: Serie) {
    // Lo que no se haya escrito se toma del objetivo de Miriam.
    const cambios: Partial<Serie> = {
      completada: true,
      reps: s.reps ?? s.obj_reps_min,
      segundos: s.segundos ?? s.obj_segundos_min,
      peso_kg: s.peso_kg ?? s.obj_peso_kg,
      distancia_m: s.distancia_m ?? s.obj_distancia_m,
    };
    cambiarSerie(s.id, cambios);
    const ok = await guardar(s, cambios);
    if (!ok) {
      cambiarSerie(s.id, { completada: false });
      return;
    }
    const siguiente = siguienteDespuesDe(s.id);
    if (siguiente && esFinDeVuelta(s, series) && s.descanso_seg > 0) {
      fijarDescanso({ fin: Date.now() + s.descanso_seg * 1000, total: s.descanso_seg, siguiente });
    } else if (siguiente) {
      setActualId(siguiente);
    }
  }

  async function deshacer(s: Serie) {
    cambiarSerie(s.id, { completada: false });
    const ok = await guardar(s, { completada: false });
    if (!ok) cambiarSerie(s.id, { completada: true });
  }

  const irA = (delta: number) => {
    const sid = secuencia[posicion + delta];
    if (sid) setActualId(sid);
  };

  const omitirEjercicio = (s: Serie) => {
    const i = secuencia.indexOf(s.id);
    const otro = secuencia.slice(i + 1).find((x) => porId.get(x)?.orden_ejercicio !== s.orden_ejercicio);
    if (otro) setActualId(otro);
  };

  const etiquetaCampo = (campo: Campo, tipo: string): string => {
    if (campo === "reps") return t.repsLabel;
    if (campo === "segundos") return t.segundosLabel;
    if (campo === "distancia") return t.distanciaLabel;
    const def = TIPOS.find((x) => x.valor === tipo)?.peso;
    return def ? def[idioma] : t.pesoLabel;
  };

  const objetivoTexto = (s: Serie): string => {
    const partes: string[] = [];
    if (s.obj_reps_min !== null) {
      partes.push(`${s.obj_reps_max ? `${s.obj_reps_min}-${s.obj_reps_max}` : s.obj_reps_min} ${t.rep}`);
    }
    if (s.obj_segundos_min !== null) {
      partes.push(`${s.obj_segundos_max ? `${s.obj_segundos_min}-${s.obj_segundos_max}` : s.obj_segundos_min} s`);
    }
    if (s.obj_peso_kg !== null) partes.push(`${s.obj_peso_kg} kg`);
    if (s.obj_distancia_m !== null) partes.push(`${s.obj_distancia_m} m`);
    return partes.join(" · ");
  };

  const anteriorTexto = (s: Serie): string | null => {
    const a = anteriores.find((x) => x.ejercicio_id === s.ejercicio_id && x.numero === s.numero);
    if (!a) return null;
    const partes: string[] = [];
    if (a.reps !== null) partes.push(`${a.reps} ${t.rep}`);
    if (a.segundos !== null) partes.push(`${a.segundos} s`);
    if (a.peso_kg !== null) partes.push(`${a.peso_kg} kg`);
    if (a.distancia_m !== null) partes.push(`${a.distancia_m} m`);
    if (a.detalle) partes.push(a.detalle);
    return partes.length > 0 ? partes.join(" · ") : null;
  };

  const valor = (n: number | null) => (n === null ? "" : String(n));
  const campoDe: Record<Campo, keyof Serie> = {
    reps: "reps",
    segundos: "segundos",
    peso: "peso_kg",
    distancia: "distancia_m",
  };
  const objetivoDe: Record<Campo, keyof Serie> = {
    reps: "obj_reps_min",
    segundos: "obj_segundos_min",
    peso: "obj_peso_kg",
    distancia: "obj_distancia_m",
  };

  const restante = descanso ? Math.max(0, Math.ceil((descanso.fin - ahora) / 1000)) : 0;
  const siguienteSerie = descanso?.siguiente ? porId.get(descanso.siguiente) : null;
  const porcentaje = series.length > 0 ? Math.round((hechas / series.length) * 100) : 0;

  const delEjercicio = actual ? series.filter((s) => s.orden_ejercicio === actual.orden_ejercicio) : [];
  const info = actual?.ejercicio_id ? ejercicios[actual.ejercicio_id] : undefined;
  const nombreActual = actual ? (idioma === "en" && info?.nombre_en) || actual.nombre_ejercicio : "";
  const tipo = actual ? TIPOS.find((x) => x.valor === actual.tipo) : undefined;
  const campos: readonly Campo[] = tipo?.campos ?? ["reps"];
  const conTiempo = campos.includes("segundos");

  return (
    <main className={`${styles.pagina} ${estilos.pagina}`}>
      <div className={estilos.cabecera}>
        <Link href="/rutina" className={estilos.volver} aria-label={t.volver}>
          ←
        </Link>
        <div className={estilos.tiempoTotal}>
          <span>{entreno.nombre_sesion}</span>
          <strong aria-label={t.tiempoLabel}>{mmss(transcurrido)}</strong>
        </div>
        <button type="button" className={estilos.finalizar} onClick={() => setConfirmar(true)}>
          {t.finalizarEntreno}
        </button>
      </div>

      <div className={estilos.progreso} role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${porcentaje}%` }} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {confirmar && (
        <section className={`${styles.tarjeta} ${estilos.confirmar}`}>
          <h2 style={{ margin: 0 }}>{t.confirmaFinalizar}</h2>
          {sinMarcar > 0 && <p className={styles.ayuda}>{t.seriesSinMarcar.replace("{n}", String(sinMarcar))}</p>}
          {muyLargo && (
            <div className={styles.campo}>
              <label htmlFor="minutos">{t.duracionLarga}</label>
              <input
                id="minutos"
                inputMode="numeric"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                placeholder={t.minutosLabel}
              />
            </div>
          )}
          <div className={estilos.fila}>
            <button type="button" className={styles.boton} disabled={terminando} onClick={terminar}>
              {terminando ? t.guardandoLabel : t.finalizarEntreno}
            </button>
            <button type="button" className={styles.botonSecundario} onClick={() => setConfirmar(false)}>
              {t.noDescartar}
            </button>
          </div>
        </section>
      )}

      {actual && !todoHecho && (
        <section className={estilos.ejercicio}>
          <div className={estilos.navegar}>
            <button type="button" aria-label="‹" disabled={posicion <= 0} onClick={() => irA(-1)}>
              ‹
            </button>
            <span>
              {t.serieN} {actual.numero} {t.semanasTotal} {delEjercicio.length}
            </span>
            <button type="button" aria-label="›" disabled={posicion >= secuencia.length - 1} onClick={() => irA(1)}>
              ›
            </button>
          </div>

          <VideoEjercicio url={info?.video_url ?? null} titulo={nombreActual} />

          <h1 className={estilos.nombre}>{nombreActual}</h1>
          {actual.nota_objetivo && <p className={styles.ayuda}>{actual.nota_objetivo}</p>}

          <div className={estilos.objetivo}>
            <span>{t.objetivoLabel}</span>
            <strong>{objetivoTexto(actual) || "—"}</strong>
          </div>
          {anteriorTexto(actual) && (
            <p className={styles.ayuda} style={{ margin: 0, textAlign: "center" }}>
              {t.ultimaVez}: {anteriorTexto(actual)}
            </p>
          )}

          {conTiempo && !actual.completada && (
            <Cronometro
              key={actual.id}
              sonido={sonido}
              alCambiarSonido={cambiarSonido}
              textos={{
                iniciar: t.cronometroIniciar,
                parar: t.cronometroParar,
                reiniciar: t.cronometroReiniciar,
                sonido: t.sonidoSegundero,
                sinSonido: t.sinSonidoSegundero,
              }}
              alParar={(seg) => cambiarSerie(actual.id, { segundos: seg })}
            />
          )}

          <div className={estilos.campos}>
            {campos.map((c) => {
              const clave = campoDe[c];
              const objetivo = actual[objetivoDe[c]] as number | null;
              return (
                <label key={c}>
                  {etiquetaCampo(c, actual.tipo)}
                  <input
                    inputMode="decimal"
                    value={valor(actual[clave] as number | null)}
                    placeholder={objetivo === null ? "" : String(objetivo)}
                    disabled={actual.completada}
                    onChange={(e) => cambiarSerie(actual.id, { [clave]: aNumero(e.target.value) } as Partial<Serie>)}
                    onBlur={() => guardar(actual)}
                  />
                </label>
              );
            })}
          </div>
          <input
            className={estilos.detalle}
            maxLength={60}
            placeholder={t.detalleBanda}
            value={actual.detalle ?? ""}
            disabled={actual.completada}
            onChange={(e) => cambiarSerie(actual.id, { detalle: e.target.value })}
            onBlur={() => guardar(actual)}
          />

          {actual.completada ? (
            <button type="button" className={styles.botonSecundario} onClick={() => deshacer(actual)}>
              ✓ {t.hechaLabel} · {t.deshacer}
            </button>
          ) : (
            <button type="button" className={`${styles.boton} ${estilos.grande}`} onClick={() => marcarHecha(actual)}>
              {t.serieHecha}
            </button>
          )}

          <div className={estilos.extras}>
            <button type="button" onClick={() => masSerie(actual.orden_ejercicio)}>
              {t.masSerie}
            </button>
            {delEjercicio.length > 1 && !actual.completada && (
              <button type="button" onClick={() => menosSerie(actual)}>
                − {t.quitarSerie}
              </button>
            )}
            <button type="button" onClick={() => omitirEjercicio(actual)}>
              {t.omitirEjercicio}
            </button>
          </div>
        </section>
      )}

      {todoHecho && (
        <section className={`${styles.tarjeta} ${estilos.completo}`}>
          <h1 style={{ margin: 0 }}>{t.entrenoCompleto}</h1>
          <p style={{ margin: 0 }}>{t.todoHechoAyuda}</p>
          <button type="button" className={`${styles.boton} ${estilos.grande}`} onClick={() => setConfirmar(true)}>
            {t.finalizarEntreno}
          </button>
        </section>
      )}

      {descanso && (
        <div className={estilos.descanso} role="timer">
          <div className={estilos.descansoCuerpo}>
            <span className={estilos.descansoTitulo}>{t.descansando}</span>
            <strong className={estilos.cuentaAtras}>{mmss(restante)}</strong>
            <div className={estilos.descansoBotones}>
              <button
                type="button"
                onClick={() => fijarDescanso({ ...descanso, fin: Math.max(Date.now() + 1000, descanso.fin - 15000) })}
              >
                −15
              </button>
              <button type="button" onClick={() => fijarDescanso({ ...descanso, fin: descanso.fin + 15000 })}>
                +15
              </button>
              <button
                type="button"
                className={estilos.saltar}
                onClick={() => {
                  const sig = descanso.siguiente;
                  fijarDescanso(null);
                  if (sig) setActualId(sig);
                }}
              >
                {t.saltar}
              </button>
            </div>
          </div>
          {siguienteSerie && (
            <div className={estilos.siguiente}>
              <span>
                {t.siguienteEs} · {t.serieN} {siguienteSerie.numero}
              </span>
              <strong>{siguienteSerie.nombre_ejercicio}</strong>
              <span>{objetivoTexto(siguienteSerie)}</span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
