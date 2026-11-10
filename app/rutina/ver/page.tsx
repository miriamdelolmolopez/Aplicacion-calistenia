"use client";

import { fotoEncajada } from "@/lib/fotos";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { lunesDe, sumarDias } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";
import Cargando from "../../Cargando";
import { useComo } from "../useComo";
import { planOnlineComo } from "../planComo";
import ResumenIconos from "../ResumenIconos";
import BotonDocumento from "../BotonDocumento";
import { CATEGORIAS } from "@/lib/ejercicios";

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
    categoria: string;
    ejercicio_musculos: { musculo: string; rol: string }[];
    ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
  } | null;
};

type Sesion = { id: string; nombre: string; orden: number; foto_url: string | null; rutina_items: Item[] };

type Datos = {
  userId: string;
  planActivo: boolean;
  rutina: { id: string; nombre: string; semanas: number; entrenosSemana: number | null; publicada: string; sesiones: Sesion[] } | null;
  anteriores: { id: string; nombre: string; publicada_en: string | null; sesiones: { id: string; nombre: string }[] }[];
  hechos: { sesionId: string | null; dia: string }[];
  dias: number[]; // 1 = lunes … 7 = domingo
};

// «como»: Miriam mira la rutina de otra persona tal y como la ve esa persona (las reglas de acceso solo se lo permiten a ella).
async function obtenerDatos(como: string | null): Promise<Datos> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = como ?? auth.user?.id ?? "";
  const { data: plan } = como ? { data: await planOnlineComo(como) } : await supabase.rpc("mi_plan_online");
  if (plan !== true) return { userId, planActivo: false, rutina: null, anteriores: [], hechos: [], dias: [] };

  const [{ data: rutinas }, { data: entrenos }, { data: dias }] = await Promise.all([
    supabase
      .from("rutinas")
      .select(
        "id, nombre, estado, semanas, entrenos_semana, publicada_en, rutina_sesiones(id, nombre, orden, foto_url, rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, ejercicios(categoria, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en)))))",
      )
      .eq("rutina_sesiones.archivada", false)
      .match(como ? { user_id: como } : {})
      .order("publicada_en", { ascending: false }),
    supabase
      .from("entrenos")
      .select("sesion_id, terminado_en")
      .match(como ? { user_id: como } : {})
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
    entrenos_semana: number | null;
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
          id: actual.id,
          nombre: actual.nombre,
          semanas: actual.semanas,
          entrenosSemana: actual.entrenos_semana,
          publicada: actual.publicada_en ?? new Date().toISOString(),
          sesiones: [...actual.rutina_sesiones]
            .sort((a, b) => a.orden - b.orden)
            .map((s) => ({ ...s, rutina_items: [...s.rutina_items].sort((a, b) => a.orden - b.orden) })),
        }
      : null,
    anteriores: filas
      .filter((r) => r.estado === "historial")
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        publicada_en: r.publicada_en,
        sesiones: [...r.rutina_sesiones].sort((a, b) => a.orden - b.orden).map((s) => ({ id: s.id, nombre: s.nombre })),
      })),
    hechos: ((entrenos ?? []) as { sesion_id: string | null; terminado_en: string | null }[])
      .filter((e) => e.terminado_en)
      .map((e) => ({ sesionId: e.sesion_id, dia: claveDia(e.terminado_en as string) })),
    dias: ((dias as { dias: number[] } | null)?.dias ?? []).slice().sort(),
  };
}

// Ver rutina: la rutina semana a semana (el calendario de días está en la pantalla principal de Entrenamiento).
export default function VerRutina() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const como = useComo();
  const hoy = claveDia(new Date().toISOString());

  useEffect(() => {
    obtenerDatos(como).then(setDatos);
  }, [como]);

  if (datos === null) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
        <Cargando />
      </main>
    );
  }

  const { rutina } = datos;

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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 className={estiloRutina.titulo} style={{ flex: 1 }}>{rutina?.nombre ?? t.opcionVerRutina}</h1>
        {rutina && <BotonDocumento id={rutina.id} texto={idioma === "en" ? "Download as document" : "Descargar como documento"} />}
      </div>

      {!datos.planActivo && <p className={styles.aviso}>{t.planNoActivo}</p>}
      {datos.planActivo && !rutina && <p className={styles.aviso}>{t.preparandoRutina}</p>}

      {datos.planActivo && rutina && (() => {
        const items = rutina.sesiones.flatMap((s) => s.rutina_items);
        const porSemana = rutina.entrenosSemana ?? rutina.sesiones.length;
        const idsSesiones = new Set(rutina.sesiones.map((s) => s.id));
        const hechosRutina = datos.hechos.filter((h) => h.sesionId && idsSesiones.has(h.sesionId)).length;
        const materiales = [...new Set(items.flatMap((i) => (i.ejercicios?.ejercicio_materiales ?? []).map((m) => (idioma === "en" && m.materiales?.nombre_en) || m.materiales?.nombre || "").filter(Boolean)))].sort((a, b) => a.localeCompare(b));
        const tipos = [...new Set(items.map((i) => i.ejercicios?.categoria).filter((c): c is string => !!c))].map((c) => CATEGORIAS.find((x) => x.valor === c)?.[idioma] ?? c);
        return (
          <ResumenIconos
            idioma={idioma}
            datos={[
              { icono: "📅", valor: String(rutina.semanas), texto: rutina.semanas === 1 ? (idioma === "en" ? "week" : "semana") : idioma === "en" ? "weeks" : "semanas" },
              { icono: "🔁", valor: String(porSemana), texto: idioma === "en" ? "workouts per week" : "entrenos por semana" },
              { icono: "🏁", valor: `${hechosRutina}/${porSemana * rutina.semanas}`, texto: idioma === "en" ? "workouts done" : "entrenos hechos" },
              { icono: "🏋️", valor: String(items.length), texto: idioma === "en" ? "exercises" : "ejercicios" },
            ]}
            tipos={tipos}
            materiales={materiales}
            intensidades={intensidadesAgregadas(items.map((i) => ({ series: i.series, musculos: i.ejercicios?.ejercicio_musculos ?? [] })))}
          />
        );
      })()}

      {datos.planActivo && (
        <>
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
                          {s.foto_url && <span className={estilos.sesionFoto} style={fotoEncajada(s.foto_url)} aria-hidden="true" />}
                          <Link href={`/rutina/sesion/${s.id}${como ? `?como=${como}` : ""}`} className={estilos.sesionTexto}>
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
                    <details>
                      <summary style={{ cursor: "pointer" }}>
                        {r.nombre}
                        {r.publicada_en && ` · ${fechaCorta(r.publicada_en, idioma)}`}
                      </summary>
                      <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
                        {r.sesiones.map((s) => (
                          <li key={s.id}>
                            <Link href={`/rutina/sesion/${s.id}`}>{s.nombre}</Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
              <p className={styles.ayuda}>{idioma === "en" ? "Open a past routine to see its sessions and the exercise videos." : "Abre una rutina anterior para ver sus sesiones y los vídeos de los ejercicios."}</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
