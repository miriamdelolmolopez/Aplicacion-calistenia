"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { obtenerFotosApp } from "../fotos/acciones";
import { obtenerFotos } from "../perfil/acciones";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import Icono from "../Icono";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { RUTAS, seccionesDe, useMiPerfil, type Seccion } from "../useMiPerfil";
import estilos from "./inicio.module.css";
import { fechaCorta, textoDia, textoHora } from "@/lib/fechas";
import { fondoFoto, type FotoNombre } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/client";

type Proxima = { empieza_en: string; nombre: string };
type Cumple = { id: string; nombre: string };
type Extra = {
  proxima: Proxima | null;
  bonos: MiBono[];
  entrenoId: string | null;
  completo: boolean;
  cumples: Cumple[];
  fotos: Record<string, string>;
};

async function cargarExtra(userId: string): Promise<Extra> {
  const supabase = createClient();
  const { data: consentimientos } = await supabase.from("consentimientos").select("tipo").eq("user_id", userId);
  const tipos = new Set((consentimientos ?? []).map((c) => c.tipo));

  const { data: reservas } = await supabase
    .from("reservas")
    .select("sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre))")
    .eq("user_id", userId)
    .eq("estado", "reservada")
    .gt("sesiones_clase.empieza_en", new Date().toISOString())
    .eq("sesiones_clase.estado", "programada");
  const filas = (reservas ?? []) as unknown as {
    sesiones_clase: { empieza_en: string; tipos_clase: { nombre: string } | null };
  }[];
  const primera = filas
    .map((f) => ({ empieza_en: f.sesiones_clase.empieza_en, nombre: f.sesiones_clase.tipos_clase?.nombre ?? "" }))
    .sort((a, b) => a.empieza_en.localeCompare(b.empieza_en))[0];

  const { data: curso } = await supabase.from("entrenos").select("id").eq("estado", "en_curso").maybeSingle();

  // Quién cumple años hoy (solo salen las personas que lo tienen activado en Ajustes).
  const { data: cumplesDatos } = await supabase.rpc("cumpleanos_hoy");
  const cumples = (cumplesDatos ?? []) as Cumple[];
  const fotos = cumples.length ? await obtenerFotos(cumples.map((c) => c.id)) : {};

  return {
    proxima: primera ?? null,
    bonos: await obtenerMisBonos(),
    entrenoId: curso?.id ?? null,
    completo: tipos.has("privacidad") && tipos.has("terminos"),
    cumples,
    fotos,
  };
}

const ACCESOS: Record<
  Exclude<Seccion, "inicio">,
  { texto: ClaveTexto; descripcion: ClaveTexto; color: string; foto?: FotoNombre }
> = {
  reservar: { texto: "navReservar", descripcion: "descReservar", color: "oliva", foto: "calistenia" },
  rutina: { texto: "miRutina", descripcion: "descRutina", color: "carbon", foto: "online" },
  progreso: { texto: "miProgreso", descripcion: "descProgreso", color: "olivaOscuro", foto: "progreso" },
  pagos: { texto: "navPagos", descripcion: "descPagos", color: "arena" },
  perfil: { texto: "navCuenta", descripcion: "descCuenta", color: "arena" },
  ajustes: { texto: "navAjustes", descripcion: "descAjustes", color: "arena" },
  admin: { texto: "panelAdmin", descripcion: "descAdmin", color: "carbon" },
};

export default function Inicio() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const perfil = useMiPerfil();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [fotoInicio, setFotoInicio] = useState<string | null>(null);
  const id = perfil && perfil !== "anonimo" ? perfil.id : null;

  useEffect(() => {
    if (perfil === "anonimo") router.replace("/entrar");
  }, [perfil, router]);

  useEffect(() => {
    if (id) cargarExtra(id).then(setExtra);
  }, [id]);

  useEffect(() => {
    obtenerFotosApp().then((f) => setFotoInicio(f.inicio));
  }, []);

  // Hasta tener los datos y las aceptaciones no se puede avanzar.
  useEffect(() => {
    if (perfil && perfil !== "anonimo" && extra && (!perfil.datosCompletos || !extra.completo)) {
      router.replace("/datos");
    }
  }, [perfil, extra, router]);

  if (!perfil || perfil === "anonimo" || !extra) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  const secciones = seccionesDe(perfil);
  const verReservas = secciones.includes("reservar");
  const bonosClases = extra.bonos.filter((b) => b.servicio !== "online" && b.estado === "activo");
  const planOnline = extra.bonos.find((b) => b.servicio === "online" && b.estado === "activo");

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <section className={estilos.hero} style={{ backgroundImage: fondoFoto("inicio", fotoInicio) }}>
        <h1>
          {t.hola}, {perfil.nombre}
        </h1>
        <p>{t.lema}</p>
      </section>

      <div className={estilos.contenido}>
        {extra.cumples.length > 0 && (
          <section className={estilos.cumple}>
            <strong>🎂 {t.cumpleHoy}</strong>
            <div className={estilos.cumpleLista}>
              {extra.cumples.map((c) => (
                <span key={c.id} className={estilos.cumpleItem}>
                  <Avatar nombre={c.nombre} url={extra.fotos[c.id]} tamano={32} />
                  {c.nombre}
                </span>
              ))}
            </div>
          </section>
        )}

        {extra.entrenoId && (
          <Link href={`/entreno/${extra.entrenoId}`} className={`${estilos.destacada} ${estilos.alerta}`}>
            <strong>{t.entrenoPendiente}</strong>
            <span>{t.seguirEntreno} →</span>
          </Link>
        )}

        {verReservas && (
          <section className={estilos.tarjeta}>
            <h2>{t.proximaClase}</h2>
            {extra.proxima ? (
              <p className={estilos.grande}>
                <strong>{extra.proxima.nombre}</strong>
                <span>
                  {textoDia(extra.proxima.empieza_en, idioma)} · {textoHora(extra.proxima.empieza_en)}
                </span>
              </p>
            ) : (
              <>
                <p className={styles.ayuda}>{t.sinProximaClase}</p>
                <Link href="/clases" className={styles.boton}>
                  {t.reservaUna}
                </Link>
              </>
            )}
          </section>
        )}

        {bonosClases.map((b) => (
          <section key={b.id} className={estilos.tarjeta}>
            <h2>{t.tuBono}</h2>
            <p className={estilos.grande}>
              <strong>{b.nombre}</strong>
              <span>
                {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes}
                {b.caducaEn && ` · ${t.caducaEl} ${fechaCorta(b.caducaEn, idioma)}`}
              </span>
            </p>
          </section>
        ))}

        {planOnline && (
          <section className={estilos.tarjeta}>
            <h2>{t.tuPlanOnlineTitulo}</h2>
            <p className={estilos.grande}>
              <strong>{planOnline.nombre}</strong>
              {planOnline.caducaEn && (
                <span>
                  {t.caducaEl} {fechaCorta(planOnline.caducaEn, idioma)}
                </span>
              )}
            </p>
          </section>
        )}

        <h2 className={estilos.atajos}>{t.atajosTitulo}</h2>
        <div className={estilos.rejilla}>
          {secciones
            .filter((s): s is Exclude<Seccion, "inicio"> => s !== "inicio")
            .map((s) => {
              const a = ACCESOS[s];
              return (
                <Link
                  key={s}
                  href={RUTAS[s]}
                  className={`${estilos.cuadro} ${estilos[a.color]}`}
                  style={a.foto ? { backgroundImage: fondoFoto(a.foto) } : undefined}
                >
                  <Icono nombre={s} tamano={30} />
                  <strong>{t[a.texto]}</strong>
                  <span>{t[a.descripcion]}</span>
                </Link>
              );
            })}
        </div>
      </div>
    </main>
  );
}
