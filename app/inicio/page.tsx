"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import Icono from "../Icono";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { RUTAS, seccionesDe, useMiPerfil, type Seccion } from "../useMiPerfil";
import estilos from "./inicio.module.css";
import { fechaCorta, textoDia, textoHora } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Proxima = { empieza_en: string; nombre: string };
type Extra = { proxima: Proxima | null; bonos: MiBono[]; entrenoId: string | null; completo: boolean };

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

  return {
    proxima: primera ?? null,
    bonos: await obtenerMisBonos(),
    entrenoId: curso?.id ?? null,
    completo: tipos.has("privacidad") && tipos.has("terminos"),
  };
}

const ACCESOS: Record<Exclude<Seccion, "inicio">, { texto: ClaveTexto; descripcion: ClaveTexto; color: string }> = {
  reservar: { texto: "navReservar", descripcion: "descReservar", color: "oliva" },
  rutina: { texto: "miRutina", descripcion: "descRutina", color: "carbon" },
  progreso: { texto: "miProgreso", descripcion: "descProgreso", color: "olivaOscuro" },
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
  const id = perfil && perfil !== "anonimo" ? perfil.id : null;

  useEffect(() => {
    if (perfil === "anonimo") router.replace("/entrar");
  }, [perfil, router]);

  useEffect(() => {
    if (id) cargarExtra(id).then(setExtra);
  }, [id]);

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
  const bonoGrupal = extra.bonos.find((b) => b.servicio !== "online" && b.estado === "activo");
  const planOnline = extra.bonos.find((b) => b.servicio === "online" && b.estado === "activo");

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>
          {t.hola}, {perfil.nombre}
        </h1>
      </div>

      <div className={estilos.contenido}>
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

        {bonoGrupal && (
          <section className={estilos.tarjeta}>
            <h2>{t.tuBono}</h2>
            <p className={estilos.grande}>
              <strong>{bonoGrupal.nombre}</strong>
              <span>
                {bonoGrupal.clasesRestantes} {t.clasesDeTotal} {bonoGrupal.clasesTotal} {t.clasesRestantes}
                {bonoGrupal.caducaEn && ` · ${t.caducaEl} ${fechaCorta(bonoGrupal.caducaEn, idioma)}`}
              </span>
            </p>
          </section>
        )}

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
                <Link key={s} href={RUTAS[s]} className={`${estilos.cuadro} ${estilos[a.color]}`}>
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
