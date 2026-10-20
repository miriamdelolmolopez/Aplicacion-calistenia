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
import Icono, { type NombreIcono } from "../Icono";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { RUTAS, seccionesDe, useMiPerfil } from "../useMiPerfil";
import ResumenAdminTarjetas from "./ResumenAdmin";
import estilos from "./inicio.module.css";
import { fechaCorta, textoDia, textoHora } from "@/lib/fechas";
import { fondoFoto, fotoDeClase, type FotoNombre } from "@/lib/fotos";
import { aceptadoVigente, versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

type Reserva = { empieza_en: string; nombre: string };
type SesionOnline = { id: string; nombre: string };
type Cumple = { id: string; nombre: string };
type Frase = { texto_es: string; texto_en: string };
type Extra = {
  reservas: Reserva[];
  rutinaNombre: string | null;
  sesionesOnline: SesionOnline[];
  bonos: MiBono[];
  entrenoId: string | null;
  completo: boolean;
  cumples: Cumple[];
  fotos: Record<string, string>;
  frases: Frase[];
};

async function cargarExtra(userId: string, planOnline: boolean): Promise<Extra> {
  const supabase = createClient();
  const { data: consentimientos } = await supabase.from("consentimientos").select("tipo, version").eq("user_id", userId);

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
  const proximas = filas
    .map((f) => ({ empieza_en: f.sesiones_clase.empieza_en, nombre: f.sesiones_clase.tipos_clase?.nombre ?? "" }))
    .sort((a, b) => a.empieza_en.localeCompare(b.empieza_en));

  // Las sesiones de su rutina online actual.
  let rutinaNombre: string | null = null;
  let sesionesOnline: SesionOnline[] = [];
  if (planOnline) {
    const { data: rutina } = await supabase
      .from("rutinas")
      .select("nombre, rutina_sesiones(id, nombre, orden)")
      .eq("user_id", userId)
      .eq("estado", "publicada")
      .limit(1)
      .maybeSingle();
    const r = rutina as { nombre: string; rutina_sesiones: { id: string; nombre: string; orden: number }[] } | null;
    if (r) {
      rutinaNombre = r.nombre;
      sesionesOnline = [...r.rutina_sesiones].sort((a, b) => a.orden - b.orden).map((s) => ({ id: s.id, nombre: s.nombre }));
    }
  }

  const { data: curso } = await supabase.from("entrenos").select("id").eq("estado", "en_curso").maybeSingle();

  // Quién cumple años hoy (solo salen las personas que lo tienen activado en Ajustes).
  const { data: cumplesDatos } = await supabase.rpc("cumpleanos_hoy");
  const cumples = (cumplesDatos ?? []) as Cumple[];
  const fotos = cumples.length ? await obtenerFotos(cumples.map((c) => c.id)) : {};

  const { data: frases } = await supabase.from("frases_inicio").select("texto_es, texto_en").eq("activa", true);

  return {
    reservas: proximas,
    rutinaNombre,
    sesionesOnline,
    bonos: await obtenerMisBonos(),
    entrenoId: curso?.id ?? null,
    completo: aceptadoVigente(consentimientos, await versionesVigentes(supabase)),
    cumples,
    fotos,
    frases: (frases ?? []) as Frase[],
  };
}

// Fotos de ejemplo entre las que se elige una al azar cada vez que se abre la app.
const FOTOS_INICIO: FotoNombre[] = ["inicio", "calistenia", "progreso", "personal"];

type Acceso = { href: string; icono: NombreIcono; texto: ClaveTexto; extra?: ClaveTexto };

export default function Inicio() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const perfil = useMiPerfil();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [propiaInicio, setPropiaInicio] = useState<string | null>(null);
  const [fotosTipos, setFotosTipos] = useState<Record<string, string>>({});
  const [azar, setAzar] = useState<{ foto: FotoNombre; frase: number } | null>(null);
  const id = perfil && perfil !== "anonimo" ? perfil.id : null;
  const planOnline = !!perfil && perfil !== "anonimo" && perfil.planOnline;

  useEffect(() => {
    if (perfil === "anonimo") router.replace("/entrar");
  }, [perfil, router]);

  useEffect(() => {
    if (!id) return;
    // La foto y la frase se eligen al azar cada vez que se abre la app.
    cargarExtra(id, planOnline).then((e) => {
      setExtra(e);
      setAzar({
        foto: FOTOS_INICIO[Math.floor(Math.random() * FOTOS_INICIO.length)],
        frase: Math.floor(Math.random() * Math.max(e.frases.length, 1)),
      });
    });
  }, [id, planOnline]);

  useEffect(() => {
    obtenerFotosApp().then((f) => {
      setPropiaInicio(f.inicio);
      setFotosTipos(f.tipos);
    });
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
  const esAdmin = perfil.rol === "admin";
  const bonosClases = esAdmin ? [] : extra.bonos.filter((b) => b.servicio !== "online" && b.estado === "activo");
  const planOnlineBono = esAdmin ? undefined : extra.bonos.find((b) => b.servicio === "online" && b.estado === "activo");

  const frase = extra.frases[azar?.frase ?? 0];
  const textoFrase = frase ? (idioma === "en" ? frase.texto_en : frase.texto_es) : "";

  const accesos: Acceso[] = [];
  if (secciones.includes("reservar")) accesos.push({ href: RUTAS.reservar, icono: "reservar", texto: "botonReservarClase" });
  if (secciones.includes("reservas")) accesos.push({ href: RUTAS.reservas, icono: "reservas", texto: "misReservasTitulo" });
  if (secciones.includes("rutina")) accesos.push({ href: RUTAS.rutina, icono: "rutina", texto: "botonEntrenoOnline" });
  if (secciones.includes("progreso")) accesos.push({ href: RUTAS.progreso, icono: "progreso", texto: "miProgreso" });
  accesos.push({ href: RUTAS.academia, icono: "academia", texto: "navAcademia" });
  accesos.push({ href: "/aprende", icono: "saber", texto: "botonSaberMas", extra: "botonGlosario" });

  return (
    <main className={styles.pagina}>
      <BarraSuperior />

      <section
        className={estilos.hero}
        style={{ backgroundImage: fondoFoto(azar?.foto ?? "inicio", propiaInicio) }}
      >
        <span className={estilos.vista}>
          {perfil.rol === "admin" ? t.vistaAdmin : perfil.rol === "invitado" ? t.vistaInvitado : t.vistaAlumno}
        </span>
        <h1>
          {t.hola}, {perfil.nombre}
        </h1>
        {textoFrase && <p className={estilos.frase}>{textoFrase}</p>}
      </section>

      <div className={estilos.contenido}>
        {esAdmin && <ResumenAdminTarjetas />}

        <div className={estilos.accesos}>
          {accesos.map((a) => (
            <Link key={a.href} href={a.href} className={estilos.acceso}>
              <Icono nombre={a.icono} tamano={26} />
              <strong>{t[a.texto]}</strong>
              {a.extra && <span>{t[a.extra]}</span>}
            </Link>
          ))}
        </div>

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

        {planOnlineBono && (
          <section className={estilos.tarjeta}>
            <h2>{t.tuPlanOnlineTitulo}</h2>
            <p className={estilos.grande}>
              <strong>{planOnlineBono.nombre}</strong>
              {planOnlineBono.caducaEn && (
                <span>
                  {t.caducaEl} {fechaCorta(planOnlineBono.caducaEn, idioma)}
                </span>
              )}
            </p>
          </section>
        )}

        {!esAdmin && <h2 className={estilos.atajos}>{t.proximosEntrenos}</h2>}
        {!esAdmin && extra.reservas.length === 0 && extra.sesionesOnline.length === 0 && (
          <p className={styles.ayuda}>{t.sinProximosEntrenos}</p>
        )}
        <div className={estilos.entrenos}>
          {extra.reservas.map((r) => (
            <Link key={r.empieza_en + r.nombre} href={RUTAS.reservar} className={estilos.entreno}>
              <span
                className={estilos.miniatura}
                style={{ backgroundImage: fondoFoto(fotoDeClase(r.nombre), fotosTipos[r.nombre]) }}
              />
              <span className={estilos.entrenoTexto}>
                <strong>{r.nombre}</strong>
                <span>
                  {textoDia(r.empieza_en, idioma)} · {textoHora(r.empieza_en)}
                </span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {extra.sesionesOnline.map((s) => (
            <Link key={s.id} href={`/rutina/sesion/${s.id}`} className={estilos.entreno}>
              <span className={estilos.miniatura} style={{ backgroundImage: fondoFoto("online") }} />
              <span className={estilos.entrenoTexto}>
                <strong>{s.nombre}</strong>
                <span>
                  {t.sesionDeTuRutina}
                  {extra.rutinaNombre ? ` · ${extra.rutinaNombre}` : ""}
                </span>
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
