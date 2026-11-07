"use client";

import { fotoEncajada } from "@/lib/fotos";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../../../BarraSuperior";
import { iniciarEntreno } from "../../../entreno/acciones";
import styles from "../../../formularios.module.css";
import { textos } from "../../../textos";
import { useIdioma } from "../../../useIdioma";
import estiloRutina from "../../entrenamiento.module.css";
import estilos from "./sesion.module.css";
import { minutosEstimados, textoObjetivo } from "@/lib/duracion";
import { claveDia } from "@/lib/fechas";
import { numeroSemana } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";
import Cargando from "../../../Cargando";
import BarraComo from "../../../BarraComo";
import { useComo } from "../../useComo";
import ResumenIconos from "../../ResumenIconos";
import { CATEGORIAS, intensidadesAgregadas } from "@/lib/ejercicios";

type Item = {
  id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  descanso_seg: number;
  grupo: number | null;
  ejercicios: {
    nombre: string;
    nombre_en: string | null;
    foto_url: string | null;
    categoria: string;
    ejercicio_musculos: { musculo: string; rol: string }[];
    ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
  } | null;
};

type Datos = { nombre: string; foto: string | null; rutina: string; items: Item[]; enCurso: string | null };

async function cargar(id: string): Promise<Datos | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("rutina_sesiones")
    .select(
      "nombre, foto_url, rutinas(nombre, publicada_en), rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, grupo, ejercicios(nombre, nombre_en, foto_url, categoria, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as { nombre: string; foto_url: string | null; rutinas: { nombre: string; publicada_en: string | null } | null; rutina_items: Item[] };

  // Si Miriam cambió algún ejercicio para esta semana, se enseña esa versión.
  type Cambio = { quitado: boolean; item_id: string; series: number | null; reps_min: number | null; reps_max: number | null; segundos_min: number | null; segundos_max: number | null; descanso_seg: number | null; ejercicio_id: string | null; ejercicios: Item["ejercicios"] };
  const semana = s.rutinas?.publicada_en ? numeroSemana(claveDia(s.rutinas.publicada_en), claveDia(new Date().toISOString())) : 1;
  const { data: cambiosDatos } = await supabase
    .from("rutina_cambios_semana")
    .select("item_id, quitado, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, ejercicio_id, ejercicios(nombre, nombre_en, foto_url, categoria, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en)))")
    .eq("semana", semana)
    .in("item_id", s.rutina_items.map((i) => i.id));
  const cambios = new Map(((cambiosDatos ?? []) as unknown as Cambio[]).map((c) => [c.item_id, c]));
  const items = s.rutina_items
    .filter((i) => !cambios.get(i.id)?.quitado)
    .map((i) => {
    const c = cambios.get(i.id);
    if (!c) return i;
    const otro = !!c.ejercicio_id;
    return {
      ...i,
      series: c.series ?? i.series,
      reps_min: otro ? c.reps_min : (c.reps_min ?? i.reps_min),
      reps_max: otro ? c.reps_max : (c.reps_max ?? i.reps_max),
      segundos_min: otro ? c.segundos_min : (c.segundos_min ?? i.segundos_min),
      segundos_max: otro ? c.segundos_max : (c.segundos_max ?? i.segundos_max),
      descanso_seg: c.descanso_seg ?? i.descanso_seg,
      ejercicios: otro ? c.ejercicios : i.ejercicios,
    };
  });

  // Ejercicios extra que solo hay esta semana (van al final).
  type Extra = { id: string; series: number; reps_min: number | null; reps_max: number | null; segundos_min: number | null; segundos_max: number | null; descanso_seg: number | null; ejercicios: Item["ejercicios"] };
  const { data: extrasDatos } = await supabase
    .from("rutina_extras_semana")
    .select("id, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, ejercicios(nombre, nombre_en, foto_url, categoria, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en)))")
    .eq("sesion_id", id)
    .eq("semana", semana)
    .order("orden")
    .order("creado_en");
  const ultimo = items.reduce((m, i) => Math.max(m, i.orden), 0);
  ((extrasDatos ?? []) as unknown as Extra[]).forEach((x, k) => {
    items.push({ id: x.id, orden: ultimo + 1 + k, series: x.series, reps_min: x.reps_min, reps_max: x.reps_max, segundos_min: x.segundos_min, segundos_max: x.segundos_max, descanso_seg: x.descanso_seg ?? 60, grupo: null, ejercicios: x.ejercicios });
  });
  const { data: curso } = await supabase.from("entrenos").select("id").eq("estado", "en_curso").maybeSingle();
  return {
    nombre: s.nombre,
    foto: s.foto_url,
    rutina: s.rutinas?.nombre ?? "",
    items: [...items].sort((a, b) => a.orden - b.orden),
    enCurso: curso?.id ?? null,
  };
}

// Resumen de una sesión: ejercicios con series y repeticiones o tiempo, y el botón de empezar.
export default function Sesion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null | undefined>(undefined);
  const [iniciando, setIniciando] = useState(false);
  const como = useComo();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargar(id).then(setDatos);
  }, [id]);

  async function iniciar() {
    setError(null);
    if (datos?.enCurso) return router.push(`/entreno/${datos.enCurso}`);
    setIniciando(true);
    const r = await iniciarEntreno(id);
    if (r.ok && r.id) return router.push(`/entreno/${r.id}`);
    setIniciando(false);
    const clave = `err_${r.codigo}` as keyof typeof t;
    setError((t[clave] as string | undefined) ?? t.errorGeneral);
  }

  if (datos === undefined) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/rutina/ver", texto: "volver" }} />
        <Cargando />
      </main>
    );
  }
  if (datos === null) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/rutina/ver", texto: "volver" }} />
        <p className={styles.aviso}>{t.sesionNoEncontrada}</p>
      </main>
    );
  }

  const letras = new Map<number, string>();
  const dentro = new Map<number, number>();

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina/ver", texto: "volver" }} />
      <h1 className={estiloRutina.titulo} style={{ marginBottom: 4 }}>
        {datos.nombre}
      </h1>
      <p className={styles.ayuda} style={{ margin: "0 0 14px" }}>
        {datos.rutina && `${datos.rutina} · `}
        {t.minAprox.replace("{n}", String(minutosEstimados(datos.items)))}
      </p>

      {datos.foto && <div style={{ height: 150, margin: "0 0 14px", borderRadius: 18, ...fotoEncajada(datos.foto) }} role="img" aria-label={datos.nombre} />}

      <ol className={estilos.lista}>
        {datos.items.map((it, pos) => {
          let etiqueta: string | null = null;
          if (it.grupo !== null) {
            if (!letras.has(it.grupo)) letras.set(it.grupo, String.fromCharCode(65 + letras.size));
            dentro.set(it.grupo, (dentro.get(it.grupo) ?? 0) + 1);
            etiqueta = `${letras.get(it.grupo)}${dentro.get(it.grupo)}`;
          }
          const e = it.ejercicios;
          const nombre = (idioma === "en" && e?.nombre_en) || e?.nombre || "";
          return (
            <li key={it.id} className={estilos.fila}>
              <span className={estilos.numero}>{pos + 1}</span>
              <span className={estilos.miniatura} style={e?.foto_url ? fotoEncajada(e.foto_url) : undefined} />
              <span className={estilos.texto}>
                <strong>
                  {etiqueta && <span className={styles.etiquetaSuper}>{etiqueta}</span>}
                  {nombre}
                </strong>
                <span>
                  {it.series} × {textoObjetivo(it, t.rep) || "—"} · {idioma === "en" ? "rest" : "descanso"} {it.descanso_seg} s
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <details style={{ margin: "16px 0 0" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, minHeight: 44, display: "flex", alignItems: "center" }}>{idioma === "en" ? "Summary and muscles worked" : "Resumen y músculos que trabaja"}</summary>
      {(() => {
        const materiales = [...new Set(datos.items.flatMap((i) => (i.ejercicios?.ejercicio_materiales ?? []).map((m) => (idioma === "en" && m.materiales?.nombre_en) || m.materiales?.nombre || "").filter(Boolean)))].sort((a, b) => a.localeCompare(b));
        const tipos = [...new Set(datos.items.map((i) => i.ejercicios?.categoria).filter((c): c is string => !!c))].map((c) => CATEGORIAS.find((x) => x.valor === c)?.[idioma] ?? c);
        return (
          <ResumenIconos
            idioma={idioma}
            datos={[
              { icono: "⏱", valor: `~${minutosEstimados(datos.items)} min`, texto: idioma === "en" ? "total time" : "tiempo total" },
              { icono: "🏋️", valor: String(datos.items.length), texto: idioma === "en" ? "exercises" : "ejercicios" },
              { icono: "🔁", valor: String(datos.items.reduce((n, i) => n + i.series, 0)), texto: idioma === "en" ? "sets" : "series" },
            ]}
            tipos={tipos}
            materiales={materiales}
            intensidades={intensidadesAgregadas(datos.items.map((i) => ({ series: i.series, musculos: i.ejercicios?.ejercicio_musculos ?? [] })))}
          />
        );
      })()}
      </details>

      {error && <p className={styles.error}>{error}</p>}

      <BarraComo />
      <div className={estilos.pie}>
        <button type="button" className={styles.boton} disabled={iniciando || datos.items.length === 0 || !!como} onClick={iniciar}>
          {datos.enCurso ? t.continuarRutina : t.iniciarRutina}
        </button>
      </div>
    </main>
  );
}
