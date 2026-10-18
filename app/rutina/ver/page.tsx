"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { descartarEntreno, iniciarEntreno } from "../../entreno/acciones";
import BarraSuperior from "../../BarraSuperior";
import CabeceraFoto from "../../CabeceraFoto";
import MapaCorporal from "../../MapaCorporal";
import styles from "../../formularios.module.css";
import estilosRutina from "../rutina.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import VideoEjercicio from "../../VideoEjercicio";
import { intensidadesAgregadas, MUSCULOS } from "@/lib/ejercicios";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Ejercicio = {
  id: string;
  nombre: string;
  nombre_en: string | null;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
  foto_url: string | null;
  tipo: string;
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
};

type Item = {
  id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number;
  nota: string | null;
  grupo: number | null;
  ejercicios: Ejercicio | null;
};

type Sesion = { id: string; nombre: string; nota: string | null; orden: number; rutina_items: Item[] };

type Rutina = {
  id: string;
  nombre: string;
  nota: string | null;
  estado: string;
  entrenos_semana: number | null;
  foto_url: string | null;
  publicada_en: string | null;
  rutina_sesiones: Sesion[];
};

type EnCurso = { id: string; nombre_sesion: string };

type Datos = { planActivo: boolean; rutinas: Rutina[]; enCurso: EnCurso | null };

async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();
  const { data: plan } = await supabase.rpc("mi_plan_online");
  if (plan !== true) return { planActivo: false, rutinas: [], enCurso: null };

  const { data: curso } = await supabase
    .from("entrenos")
    .select("id, nombre_sesion")
    .eq("estado", "en_curso")
    .maybeSingle();

  const { data } = await supabase
    .from("rutinas")
    .select(
      "id, nombre, nota, estado, entrenos_semana, foto_url, publicada_en, rutina_sesiones(id, nombre, nota, orden, rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota, grupo, ejercicios(id, nombre, nombre_en, descripcion, descripcion_en, video_url, foto_url, tipo, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en)))))",
    )
    .order("publicada_en", { ascending: false });

  const rutinas = ((data ?? []) as unknown as Rutina[]).map((r) => ({
    ...r,
    rutina_sesiones: [...r.rutina_sesiones]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({
        ...s,
        rutina_items: [...s.rutina_items].sort((a, b) => a.orden - b.orden),
      })),
  }));
  return { planActivo: true, rutinas, enCurso: (curso as EnCurso | null) ?? null };
}

export default function MiRutina() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    obtenerDatos().then(setDatos);
  }, []);

  const mensajeError = (codigo?: string) => {
    const clave = `err_${codigo}` as keyof typeof t;
    return (t[clave] as string | undefined) ?? t.errorGeneral;
  };

  async function iniciar(sesionId: string) {
    setError(null);
    setIniciando(true);
    const r = await iniciarEntreno(sesionId);
    if (r.ok && r.id) {
      router.push(`/entreno/${r.id}`);
      return;
    }
    setIniciando(false);
    setError(mensajeError(r.codigo));
  }

  async function descartar() {
    if (!datos?.enCurso) return;
    const r = await descartarEntreno(datos.enCurso.id);
    setConfirmando(false);
    if (!r.ok) {
      setError(mensajeError(r.codigo));
      return;
    }
    setDatos(await obtenerDatos());
  }

  const nombreEj = (e: Ejercicio) => (idioma === "en" && e.nombre_en) || e.nombre;
  const descEj = (e: Ejercicio) => (idioma === "en" && e.descripcion_en) || e.descripcion;
  const nombreMusculo = (valor: string) => {
    const m = MUSCULOS.find((x) => x.valor === valor);
    return m ? (idioma === "en" ? m.en : m.es) : valor;
  };

  function objetivo(item: Item): string {
    const partes: string[] = [];
    if (item.reps_min !== null) {
      partes.push(`${item.reps_max ? `${item.reps_min}-${item.reps_max}` : item.reps_min} ${t.rep}`);
    }
    if (item.segundos_min !== null) {
      partes.push(`${item.segundos_max ? `${item.segundos_min}-${item.segundos_max}` : item.segundos_min} s`);
    }
    if (item.peso_kg !== null) partes.push(`${item.peso_kg} kg`);
    if (item.distancia_m !== null) partes.push(`${item.distancia_m} m`);
    return `${item.series} × ${partes.join(" · ") || "—"}`;
  }

  function resumen(items: Item[]) {
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
      <div className={styles.cuerpoResumen}>
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
  }

  function vistaRutina(r: Rutina, entrenable = false) {
    const todos = r.rutina_sesiones.flatMap((s) => s.rutina_items);
    return (
      <div className={styles.rutinaCaja}>
        <div>
          <h2 style={{ margin: 0 }}>{r.nombre}</h2>
          <p className={styles.ayuda} style={{ margin: "4px 0 0" }}>
            {r.publicada_en && `${t.publicadaEl} ${fechaCorta(r.publicada_en, idioma)}`}
            {r.entrenos_semana && ` · ${r.entrenos_semana} ${t.entrenosPorSemana}`}
          </p>
        </div>
        {r.nota && (
          <p className={styles.aviso}>
            <strong>{t.notaDeMiriam}:</strong> {r.nota}
          </p>
        )}

        <details className={styles.desplegable}>
          <summary>{t.materialYMusculos}</summary>
          {resumen(todos)}
        </details>

        <h3 style={{ margin: "8px 0 0" }}>{t.sesionesDeRutina}</h3>
        {r.rutina_sesiones.length > 1 && (
          <>
            <div className={estilosRutina.chips}>
              {r.rutina_sesiones.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`sesion-${s.id}`)
                      ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
                  }
                >
                  {s.nombre}
                </button>
              ))}
            </div>
            <p className={styles.ayuda} style={{ margin: 0 }}>
              {t.deslizaSesiones}
            </p>
          </>
        )}
        <div className={estilosRutina.carrusel}>
        {r.rutina_sesiones.map((s) => {
          const letras = new Map<number, string>();
          const dentro = new Map<number, number>();
          return (
            <section key={s.id} id={`sesion-${s.id}`} className={styles.sesionAlumno}>
              <h3 style={{ margin: 0 }}>{s.nombre}</h3>
              {s.nota && <p className={styles.ayuda}>{s.nota}</p>}
              {s.rutina_items.length === 0 && <p className={styles.ayuda}>{t.sesionSinEjercicios}</p>}
              {entrenable && s.rutina_items.length > 0 && !datos?.enCurso && (
                <button
                  type="button"
                  className={styles.boton}
                  disabled={iniciando}
                  onClick={() => iniciar(s.id)}
                >
                  {t.iniciarEntreno}
                </button>
              )}
              <ul className={styles.listaEjercicios}>
                {s.rutina_items.map((it, pos) => {
                  let etiqueta: string | null = null;
                  if (it.grupo !== null) {
                    if (!letras.has(it.grupo)) letras.set(it.grupo, String.fromCharCode(65 + letras.size));
                    dentro.set(it.grupo, (dentro.get(it.grupo) ?? 0) + 1);
                    etiqueta = `${letras.get(it.grupo)}${dentro.get(it.grupo)}`;
                  }
                  const siguiente = s.rutina_items[pos + 1];
                  const ultimoDelGrupo = it.grupo === null || siguiente?.grupo !== it.grupo;
                  const e = it.ejercicios;
                  if (!e) return null;
                  const principales = e.ejercicio_musculos.filter((m) => m.rol === "principal");
                  const secundarios = e.ejercicio_musculos.filter((m) => m.rol === "secundario");
                  return (
                    <li key={it.id} className={`${styles.ejercicioAlumno} ${it.grupo !== null ? styles.enSuperserie : ""}`}>
                      <div className={estilosRutina.ejCabecera}>
                        {e.foto_url && <span className={estilosRutina.ejFoto} style={{ backgroundImage: `url("${e.foto_url}")` }} />}
                        <strong>
                          {etiqueta && <span className={styles.etiquetaSuper}>{etiqueta}</span>}
                          {nombreEj(e)}
                        </strong>
                      </div>
                      <div>{objetivo(it)}</div>
                      {(it.grupo === null || ultimoDelGrupo) && (
                        <div className={styles.ayuda}>
                          {t.descansoLabel}: {it.descanso_seg} s
                          {it.grupo !== null && ` · ${t.superserieAyuda}`}
                        </div>
                      )}
                      {it.nota && <div className={styles.ayuda}>{it.nota}</div>}
                      <details className={styles.desplegable}>
                        <summary>{t.verDetalle}</summary>
                        <div className={styles.cuerpoResumen}>
                          <VideoEjercicio url={e.video_url} titulo={nombreEj(e)} />
                          <p style={{ margin: 0 }}>{descEj(e) || t.sinExplicacion}</p>
                          {principales.length > 0 && (
                            <div className={styles.ayuda}>
                              <strong>{t.musculosPrincipales}:</strong>{" "}
                              {principales.map((m) => nombreMusculo(m.musculo)).join(", ")}
                            </div>
                          )}
                          {secundarios.length > 0 && (
                            <div className={styles.ayuda}>
                              <strong>{t.musculosSecundarios}:</strong>{" "}
                              {secundarios.map((m) => nombreMusculo(m.musculo)).join(", ")}
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
              <details className={styles.desplegable}>
                <summary>{t.materialYMusculos}</summary>
                {resumen(s.rutina_items)}
              </details>
            </section>
          );
        })}
        </div>
      </div>
    );
  }

  const actual = datos?.rutinas.find((r) => r.estado === "publicada");
  const anteriores = (datos?.rutinas ?? []).filter((r) => r.estado === "historial");

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
      <CabeceraFoto foto="online" titulo={t.rutinaTitulo} propia={actual?.foto_url} />

      {datos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {datos && !datos.planActivo && <p className={styles.aviso}>{t.planNoActivo}</p>}

      {datos?.planActivo && (
        <>
          <Link href="/progreso" className={styles.botonSecundario} style={{ display: "inline-block", marginBottom: 16 }}>
            🌱 {t.miProgreso}
          </Link>
          <section className={styles.tarjeta} style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>{t.rutinaActual}</h2>
            {datos.enCurso && (
              <div className={styles.aviso}>
                <strong>{t.entrenoEnCurso}</strong>
                <div>{datos.enCurso.nombre_sesion}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    className={styles.boton}
                    onClick={() => router.push(`/entreno/${datos.enCurso!.id}`)}
                  >
                    {t.continuarEntreno}
                  </button>
                  {!confirmando ? (
                    <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(true)}>
                      {t.descartarEntreno}
                    </button>
                  ) : (
                    <>
                      <span className={styles.ayuda}>{t.confirmaDescartar}</span>
                      <button type="button" className={styles.botonSecundario} onClick={descartar}>
                        {t.siDescartar}
                      </button>
                      <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(false)}>
                        {t.noDescartar}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {actual ? vistaRutina(actual, true) : <p className={styles.aviso}>{t.preparandoRutina}</p>}
            {actual && !datos.enCurso && <p className={styles.ayuda}>{t.entrenarPronto}</p>}
          </section>

          <section className={styles.tarjeta}>
            <h2 style={{ margin: 0 }}>{t.historial}</h2>
            {anteriores.length === 0 && <p className={styles.ayuda}>{t.sinHistorial}</p>}
            {anteriores.map((r) => (
              <details key={r.id} className={styles.desplegable}>
                <summary>
                  {r.nombre}
                  {r.publicada_en && ` · ${fechaCorta(r.publicada_en, idioma)}`}
                </summary>
                {vistaRutina(r)}
              </details>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
