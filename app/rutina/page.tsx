"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { descartarEntreno } from "../entreno/acciones";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import Icono, { type NombreIcono } from "../Icono";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import estilos from "./entrenamiento.module.css";
import PestanasEntreno from "./PestanasEntreno";
import { claveDia } from "@/lib/fechas";
import { fondoFoto } from "@/lib/fotos";
import { lunesDe, numeroSemana } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";

type Resumen = {
  planActivo: boolean;
  rutina: { nombre: string; fotoUrl: string | null; semana: number; objetivo: number; hechos: number } | null;
  enCurso: { id: string; nombre_sesion: string } | null;
};

async function obtenerResumen(): Promise<Resumen> {
  const supabase = createClient();
  const { data: plan } = await supabase.rpc("mi_plan_online");
  if (plan !== true) return { planActivo: false, rutina: null, enCurso: null };

  const { data: curso } = await supabase
    .from("entrenos")
    .select("id, nombre_sesion")
    .eq("estado", "en_curso")
    .maybeSingle();

  const { data } = await supabase
    .from("rutinas")
    .select("nombre, foto_url, entrenos_semana, publicada_en, rutina_sesiones(id)")
    .eq("estado", "publicada")
    .order("publicada_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = data as {
    nombre: string;
    foto_url: string | null;
    entrenos_semana: number | null;
    publicada_en: string | null;
    rutina_sesiones: { id: string }[];
  } | null;

  let rutina: Resumen["rutina"] = null;
  if (r) {
    const hoy = claveDia(new Date().toISOString());
    const lunes = lunesDe(hoy);
    const { data: recientes } = await supabase
      .from("entrenos")
      .select("terminado_en")
      .eq("estado", "terminado")
      .gte("terminado_en", new Date(Date.now() - 8 * 86400000).toISOString());
    const hechos = (recientes ?? []).filter((e) => e.terminado_en && claveDia(e.terminado_en) >= lunes).length;
    rutina = {
      nombre: r.nombre,
      fotoUrl: r.foto_url,
      semana: r.publicada_en ? numeroSemana(claveDia(r.publicada_en), hoy) : 1,
      objetivo: r.entrenos_semana ?? Math.max(r.rutina_sesiones.length, 1),
      hechos,
    };
  }
  return { planActivo: true, rutina, enCurso: (curso as Resumen["enCurso"]) ?? null };
}

const OPCIONES: { href: string; icono: NombreIcono; texto: "opcionVerRutina" | "opcionHistorial" | "opcionMetricas" }[] = [
  { href: "/rutina/ver", icono: "rutina", texto: "opcionVerRutina" },
  { href: "/rutina/historial", icono: "historial", texto: "opcionHistorial" },
  { href: "/progreso/estadisticas", icono: "metricas", texto: "opcionMetricas" },
];

// Entrenamiento online: pestaña «Mis rutinas» (resumen de la rutina actual y accesos).
export default function Entrenamiento() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerResumen().then(setDatos);
  }, []);

  async function descartar() {
    if (!datos?.enCurso) return;
    const r = await descartarEntreno(datos.enCurso.id);
    setConfirmando(false);
    if (!r.ok) {
      setError(t.errorGeneral);
      return;
    }
    setDatos(await obtenerResumen());
  }

  const r = datos?.rutina;
  const porcentaje = r ? Math.min(100, Math.round((r.hechos / r.objetivo) * 100)) : 0;

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <h1 className={estilos.titulo}>{t.entrenamientoTitulo}</h1>
      <PestanasEntreno activa="rutinas" rutinas={t.tabMisRutinas} progreso={t.tabProgreso} />

      {datos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {datos && !datos.planActivo && <p className={styles.aviso}>{t.planNoActivo}</p>}

      {datos?.planActivo && (
        <>
          {datos.enCurso && (
            <section className={estilos.curso}>
              <strong>{t.entrenoEnCurso}</strong>
              <div>{datos.enCurso.nombre_sesion}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className={styles.boton} onClick={() => router.push(`/entreno/${datos.enCurso!.id}`)}>
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
              {error && <p className={styles.error}>{error}</p>}
            </section>
          )}

          {r ? (
            <section className={estilos.resumen}>
              <div className={estilos.foto} style={{ backgroundImage: fondoFoto("online", r.fotoUrl) }} />
              <div className={estilos.resumenCuerpo}>
                <h2>{r.nombre}</h2>
                <p>
                  {t.semanaNumero} {r.semana}
                </p>
                <p>
                  {r.hechos} / {r.objetivo} {t.entrenamientosSemana}
                </p>
                <div className={estilos.barra} role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
                  <div className={estilos.barraRelleno} style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
            </section>
          ) : (
            <p className={styles.aviso}>{t.preparandoRutina}</p>
          )}

          <ul className={estilos.opciones}>
            {OPCIONES.map((o) => (
              <li key={o.href}>
                <Link href={o.href}>
                  <span>
                    <Icono nombre={o.icono} tamano={20} />
                  </span>
                  {t[o.texto]}
                  <span aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
