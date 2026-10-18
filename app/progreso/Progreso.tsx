"use client";

import { useEffect, useState } from "react";
import { borrarObjetivo, crearObjetivo } from "../admin/alumnos/acciones";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import PlantaAvatar from "./PlantaAvatar";
import estilos from "./progreso.module.css";
import { CATEGORIAS, TIPOS } from "@/lib/ejercicios";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Campo = "reps" | "segundos" | "peso_kg" | "distancia_m";

type SerieP = {
  id: string;
  ejercicio_id: string | null;
  nombre_ejercicio: string;
  tipo: string;
  orden_ejercicio: number;
  numero: number;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  detalle: string | null;
  completada: boolean;
};

type EntrenoP = {
  id: string;
  nombre_sesion: string;
  nombre_rutina: string;
  terminado_en: string;
  duracion_seg: number | null;
  entreno_series: SerieP[];
};

type Prog = {
  total: number;
  nivel: number;
  siguiente_nivel_en: number | null;
  dias_sin_entrenar: number | null;
  marchita: number;
  racha_semanas: number;
  objetivo_semana: number | null;
  entrenos_esta_semana: number;
  mes_entrenos: number;
  mes_segundos: number;
  entrenos_total: number;
  clases_total: number;
  objetivo_de_rutina: boolean;
  mes_clases: number;
  clases_por_mes: { mes: string; clases: number }[];
};

type Objetivo = {
  id: string;
  ejercicio_id: string | null;
  nombre_ejercicio: string;
  campo: Campo;
  meta: number;
};

type EjercicioLista = { id: string; nombre: string; tipo: string };

type Datos = {
  prog: Prog | null;
  entrenos: EntrenoP[];
  objetivos: Objetivo[];
  ejercicios: EjercicioLista[];
  categorias: Record<string, string>; // id del ejercicio → categoría (pino, core…)
};

const LIMITE_ENTRENOS = 300;
const CAMPOS_SERIE: Campo[] = ["reps", "segundos", "peso_kg", "distancia_m"];

const aCampo = (c: string): Campo => (c === "peso" ? "peso_kg" : c === "distancia" ? "distancia_m" : (c as Campo));

function campoPorDefecto(tipo: string): Campo {
  if (tipo === "peso_corporal_lastre" || tipo === "repeticiones_peso") return "peso_kg";
  const def = TIPOS.find((x) => x.valor === tipo);
  return aCampo(def?.campos[0] ?? "reps");
}

async function cargar(userId: string | undefined, admin: boolean): Promise<Datos> {
  const supabase = createClient();
  const rpc = userId
    ? supabase.rpc("progreso_alumno", { p_user: userId })
    : supabase.rpc("mi_progreso");

  let consultaEntrenos = supabase
    .from("entrenos")
    .select(
      "id, nombre_sesion, nombre_rutina, terminado_en, duracion_seg, entreno_series(id, ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero, reps, segundos, peso_kg, distancia_m, detalle, completada)",
    )
    .eq("estado", "terminado")
    .order("terminado_en", { ascending: false })
    .limit(LIMITE_ENTRENOS);
  let consultaObjetivos = supabase
    .from("objetivos")
    .select("id, ejercicio_id, nombre_ejercicio, campo, meta")
    .order("creado_en", { ascending: false });
  if (userId) {
    consultaEntrenos = consultaEntrenos.eq("user_id", userId);
    consultaObjetivos = consultaObjetivos.eq("user_id", userId);
  }

  const [{ data: prog }, { data: entrenos }, { data: objetivos }, lista, { data: cats }] = await Promise.all([
    rpc,
    consultaEntrenos,
    consultaObjetivos,
    admin
      ? supabase.from("ejercicios").select("id, nombre, tipo").order("nombre")
      : Promise.resolve({ data: [] as EjercicioLista[] }),
    supabase.from("ejercicios").select("id, categoria"),
  ]);

  return {
    prog: (prog as Prog | null) ?? null,
    entrenos: ((entrenos ?? []) as unknown as EntrenoP[]).map((e) => ({
      ...e,
      entreno_series: [...e.entreno_series].sort(
        (a, b) => a.orden_ejercicio - b.orden_ejercicio || a.numero - b.numero,
      ),
    })),
    objetivos: ((objetivos ?? []) as unknown as Objetivo[]).map((o) => ({ ...o, meta: Number(o.meta) })),
    ejercicios: (lista.data ?? []) as EjercicioLista[],
    categorias: Object.fromEntries(((cats ?? []) as { id: string; categoria: string }[]).map((c) => [c.id, c.categoria])),
  };
}

function nombreMes(mes: string, idioma: "es" | "en"): string {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(anio, m - 1, 1).toLocaleDateString(idioma === "en" ? "en-GB" : "es-ES", { month: "short" });
}

function duracion(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${Math.max(m, seg > 0 ? 1 : 0)} min`;
}

// Cuando lo mira Miriam (en la ficha de una alumna) los textos hablan de ella en tercera persona.
const TERCERA_PERSONA = {
  faltanEntrenos: "Le faltan {n} clases o entrenos para el siguiente nivel.",
  plantaMarchita1: "Su planta tiene sed: lleva {n} días sin clase ni entreno.",
  plantaMarchita2: "Su planta está muy mustia: lleva más de 14 días sin clase ni entreno.",
  plantaBrillante: "Racha en marcha: su planta luce hojas brillantes.",
  rachaExplica: "Cuenta las semanas seguidas en las que ha cumplido su objetivo (clases y entrenos).",
  sinRutinaRacha: "La racha empezará cuando tenga una rutina publicada.",
  sinObjetivos: "Todavía no le has puesto objetivos.",
  planNoActivoProgreso: "Su plan online no está activo.",
};

// online y presencial dicen qué partes se enseñan (según los servicios de la persona).
export default function Progreso({
  userId,
  admin = false,
  online = true,
  presencial = false,
  vista = "todo",
}: {
  userId?: string;
  admin?: boolean;
  online?: boolean;
  presencial?: boolean;
  // Qué parte se enseña: Evolución (gráficas), Estadísticas, Historial (entrenos) o todo junto.
  vista?: "todo" | "evolucion" | "estadisticas" | "historial";
}) {
  const [idioma] = useIdioma();
  const base = textos[idioma];
  const t = (admin ? { ...base, ...TERCERA_PERSONA } : base) as typeof base;
  const [datos, setDatos] = useState<Datos | null>(null);
  const [ejercicioSel, setEjercicioSel] = useState<string>("");
  const [campoSel, setCampoSel] = useState<Campo | "">("");
  const [categoria, setCategoria] = useState<string>("todas");

  useEffect(() => {
    cargar(userId, admin).then(setDatos);
  }, [userId, admin]);

  const nombreNivel = (n: number) => t[`planta${n}` as keyof typeof t] as string;

  if (datos === null) return <p className={estilos.aviso}>{t.cargando}</p>;
  if (datos.prog === null) return <p className={estilos.aviso}>{t.planNoActivoProgreso}</p>;

  const { prog, entrenos, objetivos } = datos;
  const verOnline = online;
  const verClases = presencial || !online;
  const verEstadisticas = vista === "todo" || vista === "estadisticas";

  // Ejercicios con datos (series hechas) y mejor valor de cada uno.
  const ejerciciosConDatos = new Map<string, { nombre: string; tipo: string }>();
  for (const e of entrenos) {
    for (const s of e.entreno_series) {
      if (s.completada && s.ejercicio_id && !ejerciciosConDatos.has(s.ejercicio_id)) {
        ejerciciosConDatos.set(s.ejercicio_id, { nombre: s.nombre_ejercicio, tipo: s.tipo });
      }
    }
  }
  const listaEj = [...ejerciciosConDatos.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre));
  const ejId = ejercicioSel && ejerciciosConDatos.has(ejercicioSel) ? ejercicioSel : (listaEj[0]?.[0] ?? "");
  const infoEj = ejerciciosConDatos.get(ejId);

  const valoresEj = (campo: Campo) => {
    const puntos: { fecha: string; valor: number }[] = [];
    for (const e of [...entrenos].reverse()) {
      const vals = e.entreno_series
        .filter((s) => s.completada && s.ejercicio_id === ejId)
        .map((s) => s[campo])
        .filter((v): v is number => v !== null && v !== undefined)
        .map(Number);
      if (vals.length > 0) puntos.push({ fecha: e.terminado_en, valor: Math.max(...vals) });
    }
    return puntos;
  };
  const camposDisponibles = infoEj
    ? CAMPOS_SERIE.filter((c) => valoresEj(c).length > 0)
    : [];
  const campo: Campo =
    campoSel && camposDisponibles.includes(campoSel)
      ? campoSel
      : camposDisponibles.includes(campoPorDefecto(infoEj?.tipo ?? ""))
        ? campoPorDefecto(infoEj?.tipo ?? "")
        : (camposDisponibles[0] ?? "reps");
  const puntos = infoEj ? valoresEj(campo) : [];

  const etiquetaCampo = (c: Campo, tipo?: string) => {
    if (c === "reps") return t.repsLabel;
    if (c === "segundos") return t.segundosLabel;
    if (c === "distancia_m") return t.distanciaLabel;
    const def = TIPOS.find((x) => x.valor === tipo)?.peso;
    return def ? def[idioma] : t.pesoLabel;
  };
  const unidad = (c: Campo) => (c === "reps" ? t.rep : c === "segundos" ? "s" : c === "peso_kg" ? "kg" : "m");

  const mejorDe = (o: Objetivo): number => {
    let mejor = 0;
    for (const e of entrenos) {
      for (const s of e.entreno_series) {
        const v = s[o.campo];
        if (s.completada && s.ejercicio_id === o.ejercicio_id && v !== null && Number(v) > mejor) mejor = Number(v);
      }
    }
    return mejor;
  };

  const textoSerie = (s: SerieP) => {
    const partes: string[] = [];
    if (s.reps !== null) partes.push(`${s.reps} ${t.rep}`);
    if (s.segundos !== null) partes.push(`${s.segundos} s`);
    if (s.peso_kg !== null) partes.push(`${Number(s.peso_kg)} kg`);
    if (s.distancia_m !== null) partes.push(`${s.distancia_m} m`);
    if (s.detalle) partes.push(`(${s.detalle})`);
    return partes.join(" · ") || "—";
  };

  const { racha_semanas: racha } = prog;
  const marchitaTexto =
    prog.marchita >= 2
      ? t.plantaMarchita2
      : prog.marchita === 1
        ? t.plantaMarchita1.replace("{n}", String(prog.dias_sin_entrenar ?? ""))
        : racha >= 2
          ? t.plantaBrillante
          : null;

  async function nuevoObjetivo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const meta = Number(String(f.get("meta")).replace(",", "."));
    const r = await crearObjetivo({
      userId: userId!,
      ejercicioId: String(f.get("ejercicio")),
      campo: String(f.get("campo")),
      meta,
    });
    if (!r.ok) {
      alert(r.mensaje);
      return;
    }
    formulario.reset();
    setDatos(await cargar(userId, admin));
  }

  async function quitarObjetivo(id: string) {
    if (!confirm("¿Borrar este objetivo?")) return;
    await borrarObjetivo(id, userId!);
    setDatos(await cargar(userId, admin));
  }

  return (
    <div className={estilos.contenedor}>
      {verEstadisticas && (
        <>
      <section className={estilos.tarjeta}>
        <div className={estilos.planta}>
          <PlantaAvatar
            nivel={prog.nivel}
            marchita={prog.marchita}
            brillante={racha >= 2}
            tamano={190}
            titulo={nombreNivel(prog.nivel)}
          />
          <div>
            <div className={estilos.ayuda}>
              {t.nivelLabel} {prog.nivel}
            </div>
            <h2 style={{ margin: "0 0 4px" }}>{nombreNivel(prog.nivel)}</h2>
            <p className={estilos.ayuda} style={{ margin: 0 }}>
              {prog.siguiente_nivel_en === null
                ? t.nivelMaximo
                : t.faltanEntrenos.replace("{n}", String(prog.siguiente_nivel_en))}
            </p>
            {marchitaTexto && <p className={prog.marchita ? estilos.alerta : estilos.ayuda}>{marchitaTexto}</p>}
          </div>
        </div>
      </section>

      <section className={estilos.numeros}>
        <div className={estilos.numero}>
          <span className={estilos.ayuda}>{t.rachaTitulo}</span>
          <strong>{racha}</strong>
          <span className={estilos.ayuda}>{racha === 1 ? t.rachaSemana : t.rachaSemanas}</span>
          <span className={estilos.ayuda}>
            {t.estaSemanaLabel}: {prog.entrenos_esta_semana} {t.deLabel} {prog.objetivo_semana}
          </span>
          {!prog.objetivo_de_rutina && <span className={estilos.ayuda}>{t.objetivoSinRutina}</span>}
        </div>
        <div className={estilos.numero}>
          <span className={estilos.ayuda}>{t.esteMes}</span>
          <strong>{(verClases ? prog.mes_clases : 0) + (verOnline ? prog.mes_entrenos : 0)}</strong>
          {verClases && (
            <span className={estilos.ayuda}>
              {prog.mes_clases} {t.clasesMesLabel}
            </span>
          )}
          {verOnline && (
            <span className={estilos.ayuda}>
              {prog.mes_entrenos} {t.entrenosLabel}
              {prog.mes_segundos > 0 ? ` · ${duracion(Number(prog.mes_segundos))}` : ""}
            </span>
          )}
        </div>
      </section>
      <p className={estilos.ayuda}>{t.rachaExplica}</p>

      {verClases && (
        <section className={estilos.tarjeta}>
          <h2 style={{ margin: 0 }}>{t.clasesPorMes}</h2>
          {prog.clases_total === 0 ? (
            <p className={estilos.ayuda}>{t.sinClasesAun}</p>
          ) : (
            <div className={estilos.barras}>
              {prog.clases_por_mes.map((m) => {
                const maximo = Math.max(...prog.clases_por_mes.map((x) => x.clases), 1);
                return (
                  <div key={m.mes} className={estilos.barraMes}>
                    <span>{m.clases}</span>
                    <div className={estilos.barraMesRelleno} style={{ height: `${(m.clases / maximo) * 100}%` }} />
                    <span className={estilos.ayuda}>{nombreMes(m.mes, idioma)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

        </>
      )}

      {verOnline && (
        <>
      {verEstadisticas && (
      <section className={estilos.tarjeta}>
        <h2 style={{ margin: 0 }}>{t.objetivosTitulo}</h2>
        {objetivos.length === 0 && <p className={estilos.ayuda}>{t.sinObjetivos}</p>}
        {objetivos.map((o) => {
          const mejor = mejorDe(o);
          const pct = Math.min(100, Math.round((mejor / o.meta) * 100));
          const logrado = mejor >= o.meta;
          const tipo = datos.ejercicios.find((x) => x.id === o.ejercicio_id)?.tipo;
          return (
            <div key={o.id} className={estilos.objetivo}>
              <div className={estilos.objetivoCab}>
                <strong>
                  {o.nombre_ejercicio} · {etiquetaCampo(o.campo, tipo)}: {o.meta} {unidad(o.campo)}
                </strong>
                {logrado && <span className={estilos.etiquetaOk}>{t.logradoLabel}</span>}
                {admin && (
                  <button type="button" className={estilos.botonMini} onClick={() => quitarObjetivo(o.id)}>
                    ✕
                  </button>
                )}
              </div>
              <div className={estilos.barra} aria-hidden>
                <div className={estilos.barraRelleno} style={{ width: `${pct}%` }} />
              </div>
              <span className={estilos.ayuda}>
                {t.mejorLabel}: {mejor} {unidad(o.campo)} ({pct}%)
              </span>
            </div>
          );
        })}

        {admin && (
          <form onSubmit={nuevoObjetivo} className={estilos.formObjetivo}>
            <select name="ejercicio" required defaultValue="">
              <option value="" disabled>
                Ejercicio…
              </option>
              {datos.ejercicios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <select name="campo" defaultValue="reps">
              <option value="reps">Repeticiones</option>
              <option value="segundos">Segundos</option>
              <option value="peso_kg">Peso (kg)</option>
              <option value="distancia_m">Distancia (m)</option>
            </select>
            <input name="meta" inputMode="decimal" placeholder="Meta (ej. 10)" required />
            <button type="submit" className={estilos.boton}>
              Añadir objetivo
            </button>
          </form>
        )}
      </section>
      )}

      {vista === "evolucion" && <Evolucion datos={datos} categoria={categoria} cambiarCategoria={setCategoria} t={t} idioma={idioma} unidad={unidad} campoDeEjercicio={campoPorDefecto} />}

      {vista === "todo" && (
      <section className={estilos.tarjeta}>
        <h2 style={{ margin: 0 }}>{t.graficasTitulo}</h2>
        {listaEj.length === 0 ? (
          <p className={estilos.ayuda}>{t.sinDatosGrafica}</p>
        ) : (
          <>
            <div className={estilos.selectores}>
              <label>
                {t.ejercicioLabel}
                <select value={ejId} onChange={(e) => setEjercicioSel(e.target.value)}>
                  {listaEj.map(([id, e]) => (
                    <option key={id} value={id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {camposDisponibles.length > 1 && (
                <label>
                  {t.datoLabel}
                  <select value={campo} onChange={(e) => setCampoSel(e.target.value as Campo)}>
                    {camposDisponibles.map((c) => (
                      <option key={c} value={c}>
                        {etiquetaCampo(c, infoEj?.tipo)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <Grafica
              puntos={puntos}
              meta={objetivos.find((o) => o.ejercicio_id === ejId && o.campo === campo)?.meta}
              idioma={idioma}
              unidad={unidad(campo)}
            />
          </>
        )}
      </section>
      )}

      {(vista === "todo" || vista === "historial") && (
      <section className={estilos.tarjeta}>
        <h2 style={{ margin: 0 }}>{t.misEntrenos}</h2>
        {entrenos.length === 0 && <p className={estilos.ayuda}>{t.sinEntrenos}</p>}
        {entrenos.map((e) => {
          const porEjercicio = new Map<number, SerieP[]>();
          for (const s of e.entreno_series.filter((x) => x.completada)) {
            porEjercicio.set(s.orden_ejercicio, [...(porEjercicio.get(s.orden_ejercicio) ?? []), s]);
          }
          return (
            <details key={e.id} className={estilos.desplegable}>
              <summary>
                {fechaCorta(e.terminado_en, idioma)} · {e.nombre_sesion}
                {e.duracion_seg ? ` · ${duracion(e.duracion_seg)}` : ""}
              </summary>
              <div className={estilos.detalleEntreno}>
                {[...porEjercicio.values()].map((series) => (
                  <div key={series[0].orden_ejercicio}>
                    <strong>{series[0].nombre_ejercicio}</strong>
                    <ul>
                      {series.map((s) => (
                        <li key={s.id}>
                          {t.serieN} {s.numero}: {textoSerie(s)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
        {entrenos.length >= LIMITE_ENTRENOS && <p className={estilos.ayuda}>{t.masAntiguos}</p>}
      </section>
      )}
        </>
      )}
    </div>
  );
}

function Grafica({
  puntos,
  meta,
  idioma,
  unidad,
}: {
  puntos: { fecha: string; valor: number }[];
  meta?: number;
  idioma: "es" | "en";
  unidad: string;
}) {
  const W = 320;
  const H = 170;
  const izq = 34;
  const der = 10;
  const arriba = 14;
  const abajo = 26;
  const maximo = Math.max(...puntos.map((p) => p.valor), meta ?? 0, 1) * 1.1;
  const x = (i: number) => (puntos.length === 1 ? (izq + W - der) / 2 : izq + (i * (W - izq - der)) / (puntos.length - 1));
  const y = (v: number) => arriba + (1 - v / maximo) * (H - arriba - abajo);
  const camino = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={estilos.grafica} role="img">
      {[0, 0.5, 1].map((f) => {
        const v = (maximo / 1.1) * f;
        return (
          <g key={f}>
            <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="#e3dccd" />
            <text x={izq - 4} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#5a5e3b">
              {Math.round(v * 10) / 10}
            </text>
          </g>
        );
      })}
      {meta !== undefined && (
        <g>
          <line x1={izq} x2={W - der} y1={y(meta)} y2={y(meta)} stroke="#c9a227" strokeDasharray="5 4" />
          <text x={W - der} y={y(meta) - 3} fontSize="10" textAnchor="end" fill="#8a6f10">
            {meta} {unidad}
          </text>
        </g>
      )}
      <path d={camino} fill="none" stroke="#70754b" strokeWidth={2.5} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle key={p.fecha} cx={x(i)} cy={y(p.valor)} r={4} fill="#70754b">
          <title>{`${fechaCorta(p.fecha, idioma)}: ${p.valor} ${unidad}`}</title>
        </circle>
      ))}
      <text x={izq} y={H - 8} fontSize="10" fill="#5a5e3b">
        {fechaCorta(puntos[0].fecha, idioma)}
      </text>
      {puntos.length > 1 && (
        <text x={W - der} y={H - 8} fontSize="10" textAnchor="end" fill="#5a5e3b">
          {fechaCorta(puntos[puntos.length - 1].fecha, idioma)}
        </text>
      )}
    </svg>
  );
}

// Evolución: una gráfica pequeña por ejercicio, con filtros por categoría (Todas, Pino…).
function Evolucion({
  datos,
  categoria,
  cambiarCategoria,
  t,
  idioma,
  unidad,
  campoDeEjercicio,
}: {
  datos: Datos;
  categoria: string;
  cambiarCategoria: (c: string) => void;
  t: (typeof textos)["es"];
  idioma: "es" | "en";
  unidad: (c: Campo) => string;
  campoDeEjercicio: (tipo: string) => Campo;
}) {
  const { entrenos, categorias } = datos;

  const ejercicios = new Map<string, { nombre: string; tipo: string }>();
  for (const e of entrenos) {
    for (const s of e.entreno_series) {
      if (s.completada && s.ejercicio_id && !ejercicios.has(s.ejercicio_id)) {
        ejercicios.set(s.ejercicio_id, { nombre: s.nombre_ejercicio, tipo: s.tipo });
      }
    }
  }

  const puntosDe = (id: string, campo: Campo) => {
    const puntos: { fecha: string; valor: number }[] = [];
    for (const e of [...entrenos].reverse()) {
      const vals = e.entreno_series
        .filter((s) => s.completada && s.ejercicio_id === id)
        .map((s) => s[campo])
        .filter((v): v is number => v !== null && v !== undefined)
        .map(Number);
      if (vals.length > 0) puntos.push({ fecha: e.terminado_en, valor: Math.max(...vals) });
    }
    return puntos;
  };

  const todos = [...ejercicios.entries()]
    .map(([id, e]) => {
      const preferido = campoDeEjercicio(e.tipo);
      const campo = CAMPOS_SERIE.includes(preferido) && puntosDe(id, preferido).length > 0
        ? preferido
        : (CAMPOS_SERIE.find((c) => puntosDe(id, c).length > 0) ?? preferido);
      return { id, nombre: e.nombre, campo, puntos: puntosDe(id, campo), categoria: categorias[id] ?? "otros" };
    })
    .filter((e) => e.puntos.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const presentes = CATEGORIAS.filter((c) => todos.some((e) => e.categoria === c.valor));
  const visibles = categoria === "todas" ? todos : todos.filter((e) => e.categoria === categoria);

  return (
    <>
      <div className={estilos.chips} role="tablist">
        {[{ valor: "todas", es: t.filtroTodas, en: t.filtroTodas }, ...presentes].map((c) => (
          <button
            key={c.valor}
            type="button"
            role="tab"
            aria-selected={categoria === c.valor}
            className={`${estilos.chip} ${categoria === c.valor ? estilos.chipActivo : ""}`}
            onClick={() => cambiarCategoria(c.valor)}
          >
            {idioma === "en" ? c.en : c.es}
          </button>
        ))}
      </div>

      {todos.length === 0 && <p className={estilos.aviso}>{t.sinDatosGrafica}</p>}

      {visibles.map((e) => {
        const primero = e.puntos[0];
        const ultimo = e.puntos[e.puntos.length - 1];
        const semanas = Math.max(
          1,
          Math.round((new Date(ultimo.fecha).getTime() - new Date(primero.fecha).getTime()) / (7 * 86400000)),
        );
        const mejora = e.puntos.length >= 2 && ultimo.valor > primero.valor;
        return (
          <section key={e.id} className={estilos.tarjeta}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{e.nombre}</h2>
              <span className={estilos.ayuda}>
                {mejora
                  ? semanas === 1
                    ? t.unaSemana
                    : t.mejoraEnSemanas.replace("{n}", String(semanas))
                  : t.sinMejoraAun}
              </span>
            </div>
            <Grafica puntos={e.puntos} idioma={idioma} unidad={unidad(e.campo)} />
          </section>
        );
      })}
    </>
  );
}
