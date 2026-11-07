"use client";

import { esSuelto, nombreVisible } from "@/lib/regalos";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { useFotoCard } from "../useFotosCards";
import { obtenerFotosAppCliente } from "@/lib/fotosCliente";
import { obtenerFotos } from "../perfil/acciones";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useNombresEn } from "../useNombresEn";
import { useMiPerfil } from "../useMiPerfil";
import clay from "../ui/clay.module.css";
import { IconoCorona, IconoReloj } from "../ui/Mini";
import Anillo from "../ui/Anillo";
import CampanaAvisos from "../ui/CampanaAvisos";
import TablonAnuncios from "../ui/TablonAnuncios";
import VerComoAlumno from "../admin/VerComoAlumno";
import ResumenAdminTarjetas from "./ResumenAdmin";
import { obtenerCumpleanosAdmin } from "./accionesAdmin";
import { textoCuando, type CumpleProximo } from "@/lib/cumpleanosTexto";
import estilos from "./inicio.module.css";
import { fechaCorta } from "@/lib/fechas";
import { estiloFoto, type FotoNombre } from "@/lib/fotos";
import { aceptadoVigente, versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";
import Cargando from "../Cargando";

type Reserva = { empieza_en: string; nombre: string };
type SesionOnline = { id: string; nombre: string };
type Cumple = { id: string; nombre: string };
type Frase = { texto_es: string; texto_en: string };
type Extra = {
  reservas: Reserva[];
  rutinaNombre: string | null;
  sesionesOnline: SesionOnline[];
  bonos: MiBono[];
  entrenosOnlineHechos: number;
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
      supabase.from("entrenos").select("id").eq("user_id", userId).eq("estado", "en_curso").maybeSingle(),
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

  // Entrenos online terminados desde que empezó su plan (cuentan para el círculo).
  const planOnlineActivo = bonos.find((b) => b.servicio === "online" && b.estado === "activo");
  let entrenosOnlineHechos = 0;
  if (planOnlineActivo) {
    let consulta = supabase.from("entrenos").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("estado", "terminado");
    if (planOnlineActivo.activoDesde) consulta = consulta.gte("empezado_en", planOnlineActivo.activoDesde);
    entrenosOnlineHechos = (await consulta).count ?? 0;
  }

  const cumples = (cumplesDatos ?? []) as Cumple[];
  const fotos = cumples.length ? await obtenerFotos(cumples.map((c) => c.id)) : {};

  return {
    reservas: proximas,
    rutinaNombre,
    sesionesOnline,
    bonos,
    entrenosOnlineHechos,
    entrenoId: curso?.id ?? null,
    completo: aceptadoVigente(consentimientos, versiones),
    cumples,
    fotos,
    frases: (frases ?? []) as Frase[],
  };
}

// Fotos de ejemplo entre las que se elige una al azar cada vez que se abre la app.
const FOTOS_INICIO: FotoNombre[] = ["inicio", "calistenia", "progreso", "personal"];

export default function Inicio() {
  const [idioma] = useIdioma();
  const tr = useNombresEn();
  const t = textos[idioma];
  const router = useRouter();
  const perfil = useMiPerfil();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [propiaInicio, setPropiaInicio] = useState<string | null>(null);
  const fotoBannerInicio = useFotoCard("inicio:banner");
  const [fotosListas, setFotosListas] = useState(false);
  const [miFoto, setMiFoto] = useState<string | null>(null);
  const [azar, setAzar] = useState<{ foto: FotoNombre; frase: number } | null>(null);
  // La administradora ve los cumpleaños con los días de antelación que haya elegido.
  const [cumplesAdmin, setCumplesAdmin] = useState<CumpleProximo[]>([]);
  const esAdminReal = !!perfil && perfil !== "anonimo" && perfil.rol === "admin";
  const id = perfil && perfil !== "anonimo" ? perfil.id : null;
  const planOnline = !!perfil && perfil !== "anonimo" && perfil.planOnline;

  useEffect(() => {
    if (perfil === "anonimo") router.replace("/entrar");
  }, [perfil, router]);

  // Mi foto de perfil, para el saludo de arriba.
  useEffect(() => {
    if (!id) return;
    let vigente = true;
    obtenerFotos([id])
      .then((m) => vigente && setMiFoto(m[id] ?? null))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [id]);

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
    if (!esAdminReal) return;
    obtenerCumpleanosAdmin().then(setCumplesAdmin).catch(() => {});
  }, [esAdminReal]);

  useEffect(() => {
    obtenerFotosAppCliente().then((f) => {
      setPropiaInicio(f.inicio);
      setFotosListas(true);
    });
  }, []);

  // Hasta tener los datos y las aceptaciones no se puede avanzar.
  useEffect(() => {
    if (perfil && perfil !== "anonimo" && perfil.rolReal !== "admin" && extra && (!perfil.datosCompletos || !extra.completo)) {
      router.replace("/datos");
    }
  }, [perfil, extra, router]);

  if (!perfil || perfil === "anonimo" || !extra) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior />
        <Cargando />
      </main>
    );
  }

  const esAdmin = perfil.rol === "admin";
  const bonosClases = esAdmin ? [] : extra.bonos.filter((b) => b.servicio !== "online" && (b.estado === "activo" || b.estado === "agotado"));
  const planOnlineBono = esAdmin ? undefined : extra.bonos.find((b) => b.servicio === "online" && b.estado === "activo");

  const frase = extra.frases[azar?.frase ?? 0];
  const textoFrase = frase ? (idioma === "en" ? frase.texto_en : frase.texto_es) : "";

  return (
    <main className={styles.pagina}>
      <BarraSuperior />

      {esAdmin && perfil.rolReal === "admin" && (
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "6px 0 10px" }}>
          <VerComoAlumno />
        </div>
      )}
      <header className={clay.cabecera}>
        <span className={clay.avatar}>
          <Avatar nombre={perfil.nombre} url={miFoto} tamano={40} />
        </span>
        <div className={clay.saludo}>
          <p className={clay.saludoSub}>{t.hola}</p>
          <h1 className={clay.saludoTitulo}>{perfil.nombre}</h1>
        </div>
        <CampanaAvisos />
      </header>

      <div className={clay.apilada}>
        <section className={clay.banner}>
          <div className={clay.bannerArriba}>
            <h2 className={clay.bannerTitulo}>{textoFrase}</h2>
          </div>
          <span className={clay.bannerEtiqueta}>
            {perfil.rol === "admin" ? t.vistaAdmin : perfil.rol === "invitado" ? t.vistaInvitado : t.vistaAlumno}
          </span>
          <div
            className={clay.bannerFoto}
            style={estiloFoto(azar?.foto ?? "inicio", propiaInicio ?? fotoBannerInicio, !fotosListas)}
            aria-hidden="true"
          />
        </section>
      </div>

      <div className={estilos.contenido}>
        {esAdmin && cumplesAdmin.length > 0 && (
          <div className={clay.consejoEnvoltura}>
            <span className={clay.insignia} aria-hidden="true">
              🎂
            </span>
            <section className={clay.consejo}>
              <p className={clay.consejoTexto}>
                <strong>{idioma === "en" ? "Birthdays" : "Cumpleaños"}</strong>
              </p>
              <div className={estilos.cumpleLista}>
                {cumplesAdmin.map((c) => (
                  <span key={c.id} className={estilos.cumpleItem}>
                    {c.nombre} · {textoCuando(c)}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

        {esAdmin && <ResumenAdminTarjetas />}

        {esAdmin && (
          <div className={estilos.accesos}>
            <Link href="/admin/usuarios?nuevo=1" className={estilos.acceso}>
              <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>
                +
              </span>
              <strong>Añadir alumno/a</strong>
            </Link>
          </div>
        )}

        {!esAdmin && extra.cumples.length > 0 && (
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
          const pct = b.clasesTotal > 0 ? Math.round((b.clasesHechas / b.clasesTotal) * 100) : 0;
          return (
            <section key={b.id} className={clay.tarjetaProgreso}>
              <div className={clay.progresoInfo}>
                <span className={clay.eyebrow}>{t.tuBono}</span>
                <h3 className={clay.progresoNombre}>{esSuelto(b.nombre) ? nombreVisible(b.nombre, idioma) : tr(b.nombre)}</h3>
                <div className={clay.metaFila}>
                  <span className={clay.metaChip}>
                    <IconoCorona />
                    {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes}
                  </span>
                  {b.activoDesde && b.caducaEn && (
                    <span className={clay.metaChip}>
                      <IconoReloj />
                      {fechaCorta(b.activoDesde, idioma)} – {fechaCorta(b.caducaEn, idioma)}
                    </span>
                  )}
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

        {planOnlineBono && (() => {
          const total = planOnlineBono.clasesTotal;
          const hechos = Math.min(extra.entrenosOnlineHechos, total);
          // Sin total de entrenos, el aro cuenta el tiempo que lleva el plan sobre lo que dura.
          const porEntrenos = total > 1;
          const desde = planOnlineBono.activoDesde ? new Date(planOnlineBono.activoDesde).getTime() : null;
          const hasta = planOnlineBono.caducaEn ? new Date(planOnlineBono.caducaEn).getTime() : null;
          const duracion = desde !== null && hasta !== null ? hasta - desde : 0;
          const porTiempo = !porEntrenos && duracion > 0;
          const diasRestantes = hasta !== null ? Math.max(0, Math.ceil((hasta - new Date().getTime()) / 86_400_000)) : 0;
          const pct = porEntrenos
            ? Math.round((hechos / total) * 100)
            : porTiempo
              ? Math.min(100, Math.max(0, Math.round(((new Date().getTime() - (desde as number)) / duracion) * 100)))
              : 0;
          return (
            <section className={clay.tarjetaProgreso}>
              <div className={clay.progresoInfo}>
                <span className={clay.eyebrow}>{t.tuPlanOnlineTitulo}</span>
                <h3 className={clay.progresoNombre}>{esSuelto(planOnlineBono.nombre) ? nombreVisible(planOnlineBono.nombre, idioma) : tr(planOnlineBono.nombre)}</h3>
                <div className={clay.metaFila}>
                  {porEntrenos && (
                    <span className={clay.metaChip}>
                      <IconoCorona />
                      {hechos} {t.clasesDeTotal} {total} {t.entrenosHechos}
                    </span>
                  )}
                  {porTiempo && (
                    <span className={clay.metaChip}>
                      <IconoCorona />
                      {diasRestantes} {t.diasRestantes}
                    </span>
                  )}
                  {planOnlineBono.caducaEn && (
                    <span className={clay.metaChip}>
                      <IconoReloj />
                      {t.caducaEl} {fechaCorta(planOnlineBono.caducaEn, idioma)}
                    </span>
                  )}
                </div>
              </div>
              {(porEntrenos || porTiempo) && (
                <div className={clay.gaugeWrap}>
                  <Anillo porcentaje={pct} />
                  <span className={clay.gaugePct}>{pct}%</span>
                </div>
              )}
            </section>
          );
        })()}

        <TablonAnuncios limite={3} />
      </div>
    </main>
  );
}
