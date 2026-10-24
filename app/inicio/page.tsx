"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { obtenerFotosAppCliente } from "@/lib/fotosCliente";
import { obtenerFotos } from "../perfil/acciones";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import Icono, { type NombreIcono } from "../Icono";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { RUTAS, seccionesDe, useMiPerfil } from "../useMiPerfil";
import clay from "../ui/clay.module.css";
import { IconoCorona, IconoFlecha, IconoReloj } from "../ui/Mini";
import Anillo from "../ui/Anillo";
import AvisoVistaAlumna from "../AvisoVistaAlumna";
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

  // Todo lo que no depende de otra consulta se pide a la vez (antes iba una tras otra).
  const [{ data: consentimientos }, { data: reservas }, rutinaRespuesta, { data: curso }, { data: cumplesDatos }, { data: frases }, bonos, versiones] =
    await Promise.all([
      supabase.from("consentimientos").select("tipo, version").eq("user_id", userId),
      supabase
        .from("reservas")
        .select("sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre))")
        .eq("user_id", userId)
        .eq("estado", "reservada")
        .gt("sesiones_clase.empieza_en", new Date().toISOString())
        .eq("sesiones_clase.estado", "programada"),
      // Las sesiones de su rutina online actual.
      planOnline
        ? supabase
            .from("rutinas")
            .select("nombre, rutina_sesiones(id, nombre, orden)")
            .eq("user_id", userId)
            .eq("estado", "publicada")
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("entrenos").select("id").eq("estado", "en_curso").maybeSingle(),
      // Quién cumple años hoy (solo salen las personas que lo tienen activado en Ajustes).
      supabase.rpc("cumpleanos_hoy"),
      supabase.from("frases_inicio").select("texto_es, texto_en").eq("activa", true),
      obtenerMisBonos(),
      versionesVigentes(supabase),
    ]);

  const filas = (reservas ?? []) as unknown as {
    sesiones_clase: { empieza_en: string; tipos_clase: { nombre: string } | null };
  }[];
  const proximas = filas
    .map((f) => ({ empieza_en: f.sesiones_clase.empieza_en, nombre: f.sesiones_clase.tipos_clase?.nombre ?? "" }))
    .sort((a, b) => a.empieza_en.localeCompare(b.empieza_en));

  let rutinaNombre: string | null = null;
  let sesionesOnline: SesionOnline[] = [];
  const r = rutinaRespuesta.data as { nombre: string; rutina_sesiones: { id: string; nombre: string; orden: number }[] } | null;
  if (r) {
    rutinaNombre = r.nombre;
    sesionesOnline = [...r.rutina_sesiones].sort((a, b) => a.orden - b.orden).map((s) => ({ id: s.id, nombre: s.nombre }));
  }

  const cumples = (cumplesDatos ?? []) as Cumple[];
  const fotos = cumples.length ? await obtenerFotos(cumples.map((c) => c.id)) : {};

  return {
    reservas: proximas,
    rutinaNombre,
    sesionesOnline,
    bonos,
    entrenoId: curso?.id ?? null,
    completo: aceptadoVigente(consentimientos, versiones),
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
  const [fotosListas, setFotosListas] = useState(false);
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
    obtenerFotosAppCliente().then((f) => {
      setPropiaInicio(f.inicio);
      setFotosTipos(f.tipos);
      setFotosListas(true);
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

      <AvisoVistaAlumna perfil={perfil} />
      <header className={clay.cabecera}>
        <span className={clay.avatar}>
          <Avatar nombre={perfil.nombre} tamano={40} />
        </span>
        <div className={clay.saludo}>
          <p className={clay.saludoSub}>{t.hola}</p>
          <h1 className={clay.saludoTitulo}>{perfil.nombre}</h1>
        </div>
      </header>

      <div className={clay.apilada}>
        <section className={clay.banner}>
          <div className={clay.bannerArriba}>
            <h2 className={clay.bannerTitulo}>{textoFrase}</h2>
            {secciones.includes("reservar") && (
              <Link href={RUTAS.reservar} className={clay.circuloAccion} aria-label={t.botonReservarClase}>
                <IconoFlecha />
              </Link>
            )}
          </div>
          <span className={clay.bannerEtiqueta}>
            {perfil.rol === "admin" ? t.vistaAdmin : perfil.rol === "invitado" ? t.vistaInvitado : t.vistaAlumno}
          </span>
          <div
            className={clay.bannerFoto}
            style={{ backgroundImage: fondoFoto(azar?.foto ?? "inicio", propiaInicio, !fotosListas) }}
            aria-hidden="true"
          />
        </section>
      </div>

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
          <div className={clay.consejoEnvoltura}>
            <span className={clay.insignia} aria-hidden="true">
              🎂
            </span>
            <section className={clay.consejo}>
              <p className={clay.consejoTexto}>
                <strong>{t.cumpleHoy}</strong>
              </p>
              <div className={estilos.cumpleLista}>
                {extra.cumples.map((c) => (
                  <span key={c.id} className={estilos.cumpleItem}>
                    <Avatar nombre={c.nombre} url={extra.fotos[c.id]} tamano={32} />
                    {c.nombre}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {extra.entrenoId && (
          <Link href={`/entreno/${extra.entrenoId}`} className={`${estilos.destacada} ${estilos.alerta}`}>
            <strong>{t.entrenoPendiente}</strong>
            <span>{t.seguirEntreno} →</span>
          </Link>
        )}

        {bonosClases.map((b) => {
          const pct = b.clasesTotal > 0 ? Math.round((b.clasesRestantes / b.clasesTotal) * 100) : 0;
          return (
            <section key={b.id} className={clay.tarjetaProgreso}>
              <div className={clay.progresoInfo}>
                <span className={clay.eyebrow}>{t.tuBono}</span>
                <h3 className={clay.progresoNombre}>{b.nombre}</h3>
                <div className={clay.metaFila}>
                  <span className={clay.metaChip}>
                    <IconoCorona />
                    {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes}
                  </span>
                  {b.caducaEn && (
                    <span className={clay.metaChip}>
                      <IconoReloj />
                      {t.caducaEl} {fechaCorta(b.caducaEn, idioma)}
                    </span>
                  )}
                </div>
              </div>
              <div className={clay.gaugeWrap}>
                <Anillo porcentaje={pct} />
                <span className={clay.gaugePct}>{pct}%</span>
              </div>
            </section>
          );
        })}

        {planOnlineBono && (
          <section className={clay.tarjetaProgreso}>
            <div className={clay.progresoInfo}>
              <span className={clay.eyebrow}>{t.tuPlanOnlineTitulo}</span>
              <h3 className={clay.progresoNombre}>{planOnlineBono.nombre}</h3>
              {planOnlineBono.caducaEn && (
                <div className={clay.metaFila}>
                  <span className={clay.metaChip}>
                    <IconoReloj />
                    {t.caducaEl} {fechaCorta(planOnlineBono.caducaEn, idioma)}
                  </span>
                </div>
              )}
            </div>
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
                style={{ backgroundImage: fondoFoto(fotoDeClase(r.nombre), fotosTipos[r.nombre], !fotosListas) }}
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
