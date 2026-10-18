"use client";

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
  grupo: number | null;
  ejercicios: { nombre: string; nombre_en: string | null; foto_url: string | null } | null;
};

type Datos = { nombre: string; rutina: string; items: Item[]; enCurso: string | null };

async function cargar(id: string): Promise<Datos | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("rutina_sesiones")
    .select(
      "nombre, rutinas(nombre), rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, descanso_seg, grupo, ejercicios(nombre, nombre_en, foto_url))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as { nombre: string; rutinas: { nombre: string } | null; rutina_items: Item[] };
  const { data: curso } = await supabase.from("entrenos").select("id").eq("estado", "en_curso").maybeSingle();
  return {
    nombre: s.nombre,
    rutina: s.rutinas?.nombre ?? "",
    items: [...s.rutina_items].sort((a, b) => a.orden - b.orden),
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
        <p className={styles.aviso}>{t.cargando}</p>
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
              <span className={estilos.miniatura} style={e?.foto_url ? { backgroundImage: `url("${e.foto_url}")` } : undefined} />
              <span className={estilos.texto}>
                <strong>
                  {etiqueta && <span className={styles.etiquetaSuper}>{etiqueta}</span>}
                  {nombre}
                </strong>
                <span>
                  {it.series} × {textoObjetivo(it, t.rep) || "—"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {error && <p className={styles.error}>{error}</p>}

      <div className={estilos.pie}>
        <button type="button" className={styles.boton} disabled={iniciando || datos.items.length === 0} onClick={iniciar}>
          {datos.enCurso ? t.continuarRutina : t.iniciarRutina}
        </button>
      </div>
    </main>
  );
}
