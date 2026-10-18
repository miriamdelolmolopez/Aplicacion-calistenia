"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import { agregarSerie, finalizarEntreno, guardarSerie, quitarSerie } from "../acciones";
import estilos from "./entreno.module.css";
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

type Datos = { entreno: Entreno; series: Serie[]; anteriores: Anterior[] };

const CUATRO_HORAS = 4 * 3600;

const ahoraMs = () => Date.now();

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
  if (ids.length > 0 && entreno.estado === "en_curso") {
    const { data } = await supabase.rpc("ultima_vez", { p_ejercicios: ids });
    anteriores = (data ?? []) as Anterior[];
  }
  return { entreno: entreno as Entreno, series: lista, anteriores };
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

export default function PantallaEntreno() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [idioma] = useIdioma();
  const t = textos[idioma];

  const [datos, setDatos] = useState<Datos | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [ahora, setAhora] = useState(0);
  const [descanso, setDescanso] = useState<{ fin: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminando, setTerminando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [minutos, setMinutos] = useState("");
  const avisado = useRef(false);

  const mensajeError = useCallback(
    (codigo?: string) => ((t[`err_${codigo}` as keyof typeof t] as string | undefined) ?? t.errorGeneral),
    [t],
  );

  useEffect(() => {
    cargar(id).then((d) => {
      if (!d) setNoExiste(true);
      else setDatos(d);
    });
  }, [id]);

  // Reloj: se actualiza cada medio segundo mientras el entreno está en curso.
  const enCurso = datos?.entreno.estado === "en_curso";
  useEffect(() => {
    if (!enCurso) return;
    const tic = () => setAhora(Date.now());
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

  // Aviso al acabar el descanso.
  useEffect(() => {
    if (!descanso || ahora < descanso.fin || avisado.current) return;
    avisado.current = true;
    pitido();
    navigator.vibrate?.([300, 150, 300]);
  }, [ahora, descanso]);

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

  async function marcarHecha(s: Serie, todas: Serie[]) {
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
    if (esFinDeVuelta(s, todas) && s.descanso_seg > 0) {
      avisado.current = false;
      setDescanso({ fin: ahoraMs() + s.descanso_seg * 1000, total: s.descanso_seg });
    }
  }

  async function deshacer(s: Serie) {
    cambiarSerie(s.id, { completada: false });
    const ok = await guardar(s, { completada: false });
    if (!ok) cambiarSerie(s.id, { completada: true });
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
    if (nuevo) setDatos(nuevo);
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
    setDescanso(null);
    const nuevo = await cargar(id);
    if (nuevo) setDatos(nuevo);
    setTerminando(false);
  }

  if (noExiste) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
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

  const { entreno, series, anteriores } = datos;

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
        <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
        <p className={styles.aviso}>{t.entrenoNoEncontrado}</p>
      </main>
    );
  }

  const transcurrido = ahora > 0 ? (ahora - new Date(entreno.empezado_en).getTime()) / 1000 : 0;
  const muyLargo = transcurrido > CUATRO_HORAS;
  const sinMarcar = series.filter((s) => !s.completada).length;

  // Ejercicios en orden, agrupando las superseries.
  const ordenes = [...new Set(series.map((s) => s.orden_ejercicio))].sort((a, b) => a - b);
  const letras = new Map<number, string>();
  const etiquetaDe = (orden: number): string | null => {
    const g = series.find((s) => s.orden_ejercicio === orden)?.grupo ?? null;
    if (g === null) return null;
    const delGrupo = [...new Set(series.filter((s) => s.grupo === g).map((s) => s.orden_ejercicio))].sort((a, b) => a - b);
    return `${letras.get(g) ?? ""}${delGrupo.indexOf(orden) + 1}`;
  };
  for (const o of ordenes) {
    const g = series.find((s) => s.orden_ejercicio === o)?.grupo ?? null;
    if (g !== null && !letras.has(g)) letras.set(g, String.fromCharCode(65 + letras.size));
  }

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

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />

      <div className={estilos.barra}>
        <div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>{entreno.nombre_sesion}</div>
          <div className={estilos.tiempo} aria-label={t.tiempoLabel}>
            {mmss(transcurrido)}
          </div>
        </div>
        <button type="button" className={styles.boton} onClick={() => setConfirmar(true)}>
          {t.finalizarEntreno}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {confirmar && (
        <section className={styles.tarjeta} style={{ marginBottom: 12 }}>
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
          <div className={estilos.pie}>
            <button type="button" className={styles.boton} disabled={terminando} onClick={terminar}>
              {terminando ? t.guardandoLabel : t.finalizarEntreno}
            </button>
            <button type="button" className={styles.botonSecundario} onClick={() => setConfirmar(false)}>
              {t.noDescartar}
            </button>
          </div>
        </section>
      )}

      {ordenes.map((orden) => {
        const delEjercicio = series.filter((s) => s.orden_ejercicio === orden);
        const primera = delEjercicio[0];
        const etiqueta = etiquetaDe(orden);
        const tipo = TIPOS.find((x) => x.valor === primera.tipo);
        const campos: readonly Campo[] = tipo?.campos ?? ["reps"];
        const ultimoDelGrupo = primera.grupo !== null && esFinDeVuelta(primera, series);
        return (
          <section
            key={orden}
            className={`${estilos.bloque} ${primera.grupo !== null ? estilos.bloqueSuper : ""}`}
          >
            <div>
              <strong>
                {etiqueta && <span className={styles.etiquetaSuper}>{etiqueta}</span>}
                {primera.nombre_ejercicio}
              </strong>
              {primera.nota_objetivo && <div className={styles.ayuda}>{primera.nota_objetivo}</div>}
              {primera.grupo !== null && ultimoDelGrupo && <div className={styles.ayuda}>{t.alternaSuper}</div>}
            </div>

            {delEjercicio.map((s) => {
              const previo = anteriorTexto(s);
              return (
                <div key={s.id} className={`${estilos.serie} ${s.completada ? estilos.serieHecha : ""}`}>
                  <div className={estilos.serieCabecera}>
                    <strong>
                      {t.serieN} {s.numero}
                    </strong>
                    <span className={styles.ayuda}>
                      {t.objetivoLabel}: {objetivoTexto(s) || "—"}
                    </span>
                  </div>
                  {previo && (
                    <div className={styles.ayuda}>
                      {t.ultimaVez}: {previo}
                    </div>
                  )}
                  <div className={estilos.campos}>
                    {campos.map((c) => {
                      const clave = campoDe[c];
                      const objetivo = s[objetivoDe[c]] as number | null;
                      return (
                        <label key={c}>
                          {etiquetaCampo(c, s.tipo)}
                          <input
                            inputMode="decimal"
                            value={valor(s[clave] as number | null)}
                            placeholder={objetivo === null ? "" : String(objetivo)}
                            disabled={s.completada}
                            onChange={(e) => cambiarSerie(s.id, { [clave]: aNumero(e.target.value) } as Partial<Serie>)}
                            onBlur={() => guardar(s)}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <input
                    className={estilos.detalle}
                    maxLength={60}
                    placeholder={t.detalleBanda}
                    value={s.detalle ?? ""}
                    disabled={s.completada}
                    onChange={(e) => cambiarSerie(s.id, { detalle: e.target.value })}
                    onBlur={() => guardar(s)}
                  />
                  <div className={estilos.pie}>
                    {s.completada ? (
                      <button type="button" className={styles.botonSecundario} onClick={() => deshacer(s)}>
                        ✓ {t.hechaLabel} · {t.deshacer}
                      </button>
                    ) : (
                      <>
                        <button type="button" className={styles.boton} onClick={() => marcarHecha(s, series)}>
                          {t.hechaLabel}
                        </button>
                        {delEjercicio.length > 1 && (
                          <button type="button" className={styles.botonSecundario} onClick={() => menosSerie(s)}>
                            {t.quitarSerie}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div>
              <button type="button" className={styles.botonSecundario} onClick={() => masSerie(orden)}>
                {t.masSerie}
              </button>
            </div>
          </section>
        );
      })}

      <div className={estilos.relleno} />

      {descanso && (
        <div className={estilos.descanso} role="timer">
          <div>
            <div style={{ fontSize: "0.8rem" }}>{t.descansando}</div>
            <div className={estilos.cuentaAtras}>{mmss(restante)}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={estilos.mini}
              onClick={() => setDescanso((d) => (d ? { ...d, fin: Math.max(Date.now(), d.fin - 15000) } : d))}
            >
              −15
            </button>
            <button
              type="button"
              className={estilos.mini}
              onClick={() => {
                avisado.current = false;
                setDescanso((d) => (d ? { ...d, fin: d.fin + 15000 } : d));
              }}
            >
              +15
            </button>
            <button type="button" className={estilos.mini} onClick={() => setDescanso(null)}>
              {t.saltar}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
