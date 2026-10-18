"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import MapaCorporal from "../../MapaCorporal";
import styles from "../../formularios.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import estiloRutina from "../entrenamiento.module.css";
import estilos from "./ver.module.css";
import { minutosEstimados } from "@/lib/duracion";
import { intensidadesAgregadas } from "@/lib/ejercicios";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { diaDeLaSemana, lunesDe, sumarDias } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  descanso_seg: number;
  ejercicios: {
    ejercicio_musculos: { musculo: string; rol: string }[];
    ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
  } | null;
};

type Sesion = { id: string; nombre: string; orden: number; rutina_items: Item[] };

type Datos = {
  userId: string;
  planActivo: boolean;
  rutina: { nombre: string; semanas: number; publicada: string; sesiones: Sesion[] } | null;
  anteriores: { id: string; nombre: string; publicada_en: string | null }[];
  hechos: { sesionId: string | null; dia: string }[];
  dias: number[]; // 1 = lunes … 7 = domingo
};

async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? "";
  const { data: plan } = await supabase.rpc("mi_plan_online");
  if (plan !== true) return { userId, planActivo: false, rutina: null, anteriores: [], hechos: [], dias: [] };

  const [{ data: rutinas }, { data: entrenos }, { data: dias }] = await Promise.all([
    supabase
      .from("rutinas")
      .select(
        "id, nombre, estado, semanas, publicada_en, rutina_sesiones(id, nombre, orden, rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, ejercicios(ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en)))))",
      )
      .order("publicada_en", { ascending: false }),
    supabase
      .from("entrenos")
      .select("sesion_id, terminado_en")
      .eq("estado", "terminado")
      .order("terminado_en", { ascending: false })
      .limit(500),
    supabase.from("dias_entreno").select("dias").eq("user_id", userId).maybeSingle(),
  ]);

  type Fila = {
    id: string;
    nombre: string;
    estado: string;
    semanas: number;
    publicada_en: string | null;
    rutina_sesiones: Sesion[];
  };
  const filas = (rutinas ?? []) as unknown as Fila[];
  const actual = filas.find((r) => r.estado === "publicada");

  return {
    userId,
    planActivo: true,
    rutina: actual
      ? {
          nombre: actual.nombre,
          semanas: actual.semanas,
          publicada: actual.publicada_en ?? new Date().toISOString(),
          sesiones: [...actual.rutina_sesiones]
            .sort((a, b) => a.orden - b.orden)
            .map((s) => ({ ...s, rutina_items: [...s.rutina_items].sort((a, b) => a.orden - b.orden) })),
        }
      : null,
    anteriores: filas
      .filter((r) => r.estado === "historial")
      .map((r) => ({ id: r.id, nombre: r.nombre, publicada_en: r.publicada_en })),
    hechos: ((entrenos ?? []) as { sesion_id: string | null; terminado_en: string | null }[])
      .filter((e) => e.terminado_en)
      .map((e) => ({ sesionId: e.sesion_id, dia: claveDia(e.terminado_en as string) })),
    dias: ((dias as { dias: number[] } | null)?.dias ?? []).slice().sort(),
  };
}

const LETRAS = {
  es: ["L", "M", "X", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

// Ver rutina: calendario del mes con los días de entreno y la rutina semana a semana.
export default function VerRutina() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [mes, setMes] = useState<string | null>(null); // AAAA-MM
  const [abierta, setAbierta] = useState<string | null>(null);
  // Los días elegidos hasta el momento (así dos toques seguidos no se pisan).
  const diasRef = useRef<number[]>([]);

  useEffect(() => {
    obtenerDatos().then((d) => {
      diasRef.current = d.dias;
      setDatos(d);
    });
  }, []);

  async function alternarDia(isoDia: number) {
    if (!datos) return;
    const actuales = diasRef.current;
    const nuevos = actuales.includes(isoDia) ? actuales.filter((d) => d !== isoDia) : [...actuales, isoDia].sort();
    diasRef.current = nuevos;
    setDatos((d) => (d ? { ...d, dias: nuevos } : d));
    await createClient().from("dias_entreno").upsert({ user_id: datos.userId, dias: nuevos, actualizado_en: new Date().toISOString() });
  }

  const hoy = claveDia(new Date().toISOString());
  const mesActual = mes ?? hoy.slice(0, 7);

  if (datos === null) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  const { rutina } = datos;
  const hechosDias = new Set(datos.hechos.map((h) => h.dia));

  // ---- Calendario del mes ----
  const [anio, numMes] = mesActual.split("-").map(Number);
  const primero = `${mesActual}-01`;
  const diasDelMes = new Date(anio, numMes, 0).getDate();
  const huecos = diaDeLaSemana(primero);
  const celdas: (string | null)[] = [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => `${mesActual}-${String(i + 1).padStart(2, "0")}`),
  ];
  const cambiarMes = (n: number) => {
    const d = new Date(anio, numMes - 1 + n, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nombreMes = new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric" }).format(
    new Date(anio, numMes - 1, 1),
  );

  // ---- Semanas de la rutina ----
  const inicioRutina = rutina ? lunesDe(claveDia(rutina.publicada)) : "";
  const semanasLista = rutina ? Array.from({ length: rutina.semanas }, (_, i) => sumarDias(inicioRutina, i * 7)) : [];
  const lunesHoy = lunesDe(hoy);

  const resumen = (items: Item[]) => {
    const materiales = [
      ...new Set(
        items.flatMap((i) =>
          (i.ejercicios?.ejercicio_materiales ?? [])
            .map((m) => (idioma === "en" && m.materiales?.nombre_en) || m.materiales?.nombre || "")
            .filter(Boolean),
        ),
      ),
    ].sort((a, b) => a.localeCompare(b));
    const intensidades = intensidadesAgregadas(
      items.map((i) => ({ series: i.series, musculos: i.ejercicios?.ejercicio_musculos ?? [] })),
    );
    return (
      <div className={estilos.desplegable}>
        <div>
          <strong>{t.materialNecesario}</strong>
          {materiales.length === 0 ? (
            <p className={styles.ayuda}>{t.sinMaterial}</p>
          ) : (
            <ul className={styles.lista}>
              {materiales.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <strong>{t.musculosTrabajados}</strong>
          <MapaCorporal intensidades={intensidades} etiquetas={{ frente: t.frente, espalda: t.espalda }} />
        </div>
      </div>
    );
  };

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
      <h1 className={estiloRutina.titulo}>{rutina?.nombre ?? t.opcionVerRutina}</h1>

      {!datos.planActivo && <p className={styles.aviso}>{t.planNoActivo}</p>}
      {datos.planActivo && !rutina && <p className={styles.aviso}>{t.preparandoRutina}</p>}

      {datos.planActivo && (
        <>
          <section className={estilos.calendario}>
            <h2>{t.tusDiasEntreno}</h2>
            <p className={styles.ayuda}>{t.diasAyuda}</p>
            <div className={estilos.elegirDias}>
              {LETRAS[idioma].map((letra, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={datos.dias.includes(i + 1)}
                  className={datos.dias.includes(i + 1) ? estilos.diaActivo : ""}
                  onClick={() => alternarDia(i + 1)}
                >
                  {letra}
                </button>
              ))}
            </div>

            <div className={estilos.mesCabecera}>
              <button type="button" aria-label={t.semanaAnterior} onClick={() => cambiarMes(-1)}>
                ‹
              </button>
              <strong>{nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}</strong>
              <button type="button" aria-label={t.semanaSiguiente} onClick={() => cambiarMes(1)}>
                ›
              </button>
            </div>
            <div className={estilos.rejilla}>
              {LETRAS[idioma].map((letra, i) => (
                <span key={i} className={estilos.letra}>
                  {letra}
                </span>
              ))}
              {celdas.map((d, i) => {
                if (!d) return <span key={`v${i}`} />;
                const hecho = hechosDias.has(d);
                const previsto = !hecho && d >= hoy && datos.dias.includes(diaDeLaSemana(d) + 1);
                return (
                  <span
                    key={d}
                    className={`${estilos.dia} ${hecho ? estilos.diaHecho : ""} ${previsto ? estilos.diaPrevisto : ""} ${d === hoy ? estilos.hoy : ""}`}
                  >
                    {hecho ? "✓" : Number(d.slice(8))}
                  </span>
                );
              })}
            </div>
          </section>

          {rutina &&
            semanasLista.map((lunes, k) => {
              const domingo = sumarDias(lunes, 6);
              const esta = lunes === lunesHoy;
              return (
                <section key={lunes} className={estilos.semana}>
                  <h2>
                    {t.semanaNumero} {k + 1}
                    {esta && <span className={estilos.etiquetaEsta}>{t.estaSemanaLabel}</span>}
                  </h2>
                  <p className={styles.ayuda} style={{ margin: 0 }}>
                    {fechaCorta(`${lunes}T12:00:00Z`, idioma)} – {fechaCorta(`${domingo}T12:00:00Z`, idioma)}
                  </p>
                  {rutina.sesiones.map((s) => {
                    const completada = datos.hechos.some((h) => h.sesionId === s.id && h.dia >= lunes && h.dia <= domingo);
                    const clave = `${lunes}-${s.id}`;
                    const minutos = minutosEstimados(s.rutina_items);
                    return (
                      <article key={clave} className={`${estilos.sesion} ${completada ? estilos.sesionHecha : ""}`}>
                        <div className={estilos.sesionFila}>
                          <span className={estilos.check} aria-label={completada ? t.completadaLabel : undefined}>
                            {completada ? "✓" : ""}
                          </span>
                          <Link href={`/rutina/sesion/${s.id}`} className={estilos.sesionTexto}>
                            <strong>{s.nombre}</strong>
                            <span>
                              {t.minAprox.replace("{n}", String(minutos))} · {t.ejerciciosN.replace("{n}", String(s.rutina_items.length))}
                            </span>
                          </Link>
                          <button
                            type="button"
                            className={estilos.flecha}
                            aria-expanded={abierta === clave}
                            aria-label={t.verDetalleSesion}
                            onClick={() => setAbierta(abierta === clave ? null : clave)}
                          >
                            {abierta === clave ? "▴" : "▾"}
                          </button>
                        </div>
                        {abierta === clave && resumen(s.rutina_items)}
                      </article>
                    );
                  })}
                </section>
              );
            })}

          {datos.anteriores.length > 0 && (
            <section className={estilos.semana}>
              <h2>{t.rutinasAnteriores}</h2>
              <ul className={styles.lista} style={{ paddingLeft: 18 }}>
                {datos.anteriores.map((r) => (
                  <li key={r.id}>
                    {r.nombre}
                    {r.publicada_en && ` · ${fechaCorta(r.publicada_en, idioma)}`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
