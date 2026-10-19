"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import { obtenerMisBonos, type MiBono } from "../../cuenta/acciones";
import styles from "../../formularios.module.css";
import { textos, type ClaveTexto } from "../../textos";
import { useIdioma } from "../../useIdioma";
import { cancelarMiReserva } from "../acciones";
import estilos from "./mis-reservas.module.css";
import { descargarIcs, enlaceGoogleCalendar, LUGAR_CLASES } from "@/lib/calendario";
import { colorDeTipo, nombreCorto } from "@/lib/colores";
import { claveDia, fechaCorta, textoDia, textoHora } from "@/lib/fechas";
import { diaDeLaSemana } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";

type Reserva = {
  id: string;
  sesionId: string;
  empieza_en: string;
  tipo: string;
  servicio: string;
  duracion_min: number;
  color: string;
};

type TipoClase = { nombre: string; color: string };

type Datos = { reservas: Reserva[]; bonos: MiBono[]; horas: number; horasIndividual: number; tipos: TipoClase[] };

async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? "";

  const [{ data }, bonos, { data: ajustes }, { data: tiposData }] = await Promise.all([
    supabase
      .from("reservas")
      .select("id, sesion_id, sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre, servicio, duracion_min, color))")
      .eq("user_id", userId)
      .eq("estado", "reservada")
      .eq("sesiones_clase.estado", "programada")
      .order("sesiones_clase(empieza_en)", { ascending: true })
      .limit(1000),
    obtenerMisBonos(),
    supabase.from("ajustes").select("clave, valor").in("clave", ["cancelacion_horas", "cancelacion_horas_individual"]),
    supabase.from("tipos_clase").select("nombre, color, activo").eq("activo", true).order("nombre"),
  ]);

  type Fila = {
    id: string;
    sesion_id: string;
    sesiones_clase: { empieza_en: string; tipos_clase: { nombre: string; servicio: string; duracion_min: number; color: string | null } | null };
  };
  const reservas = ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    sesionId: f.sesion_id,
    empieza_en: f.sesiones_clase.empieza_en,
    tipo: f.sesiones_clase.tipos_clase?.nombre ?? "",
    servicio: f.sesiones_clase.tipos_clase?.servicio ?? "grupal",
    duracion_min: f.sesiones_clase.tipos_clase?.duracion_min ?? 60,
    color: colorDeTipo(f.sesiones_clase.tipos_clase?.color, f.sesiones_clase.tipos_clase?.nombre ?? ""),
  }));
  const tipos = ((tiposData ?? []) as { nombre: string; color: string | null }[]).map((t) => ({
    nombre: t.nombre,
    color: colorDeTipo(t.color, t.nombre),
  }));
  return { reservas, bonos, horas: Number(ajustes?.find((a) => a.clave === "cancelacion_horas")?.valor ?? 2), horasIndividual: Number(ajustes?.find((a) => a.clave === "cancelacion_horas_individual")?.valor ?? 12), tipos };
}

const LETRAS = {
  es: ["L", "M", "X", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

// Mis reservas: resumen de su bono y calendario mensual con sus clases (hechas y próximas).
export default function MisReservas() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [mes, setMes] = useState<string | null>(null); // AAAA-MM
  const [dia, setDia] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; clave: ClaveTexto } | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [alCalendario, setAlCalendario] = useState<string | null>(null);

  useEffect(() => {
    obtenerDatos().then(setDatos);
  }, []);

  const ahoraIso = new Date().toISOString();
  const hoy = claveDia(ahoraIso);
  const mesActual = mes ?? hoy.slice(0, 7);
  const [anio, numMes] = mesActual.split("-").map(Number);

  if (datos === null) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/clases", texto: "volver" }} />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  const porDia = new Map<string, Reserva[]>();
  for (const r of datos.reservas) {
    const d = claveDia(r.empieza_en);
    porDia.set(d, [...(porDia.get(d) ?? []), r]);
  }

  const primero = `${mesActual}-01`;
  const diasDelMes = new Date(anio, numMes, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: diaDeLaSemana(primero) }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => `${mesActual}-${String(i + 1).padStart(2, "0")}`),
  ];
  const cambiarMes = (n: number) => {
    const d = new Date(anio, numMes - 1 + n, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setDia(null);
  };
  const nombreMes = new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric" }).format(
    new Date(anio, numMes - 1, 1),
  );

  // Resumen por servicio (solo clases presenciales).
  const bonosClases = datos.bonos.filter((b) => b.servicio !== "online" && b.estado === "activo");
  const nombreServicio = (s: string) => (s === "individual" ? t.filtroPersonal : t.filtroGrupales);

  const delDia = dia ? (porDia.get(dia) ?? []) : [];

  async function cancelar(r: Reserva) {
    setTrabajando(true);
    const res = await cancelarMiReserva(r.id);
    setTrabajando(false);
    setConfirmando(null);
    setAviso(
      res.ok
        ? { ok: true, clave: res.devuelta ? "okDevuelta" : "okPerdida" }
        : { ok: false, clave: `err_${res.codigo}` as ClaveTexto },
    );
    setDatos(await obtenerDatos());
  }

  const evento = (r: Reserva) => ({
    id: r.sesionId,
    titulo: `${r.tipo} · Miriam del Olmo`,
    inicioIso: r.empieza_en,
    duracionMin: r.duracion_min || 60,
    descripcion: `${t.recuerdaLlegar} ${t.traeAgua}`,
  });

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/clases", texto: "volver" }} />
      <h1 className={estilos.titulo}>{t.misReservasTitulo}</h1>

      {bonosClases.map((b) => (
        <section key={b.id} className={estilos.resumen}>
          <div>
            <span className={estilos.etiqueta}>{nombreServicio(b.servicio)}</span>
            <strong>{b.nombre}</strong>
            {b.caducaEn && (
              <span className={estilos.pequeno}>
                {t.caducaEl} {fechaCorta(b.caducaEn, idioma)}
              </span>
            )}
            <span className={estilos.pequeno}>
              {t.hasReservado.replace("{a}", String(b.clasesTotal - b.clasesRestantes)).replace("{b}", String(b.clasesTotal))} ·{" "}
              {b.clasesRestantes === 1 ? t.teQueda : t.teQuedan.replace("{n}", String(b.clasesRestantes))}
            </span>
          </div>
          <strong className={estilos.numeroGrande}>{b.clasesRestantes}</strong>
        </section>
      ))}

      {aviso && (
        <p className={aviso.ok ? styles.aviso : styles.error} role="status">
          {t[aviso.clave]}
        </p>
      )}

      <section className={estilos.calendario}>
        <div className={estilos.mesCabecera}>
          <button type="button" aria-label={t.semanaAnterior} onClick={() => cambiarMes(-1)}>
            ‹
          </button>
          <strong>{nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}</strong>
          <button type="button" aria-label={t.semanaSiguiente} onClick={() => cambiarMes(1)}>
            ›
          </button>
        </div>

        <div className={estilos.rejilla}>
          {LETRAS[idioma].map((letra, i) => (
            <span key={i} className={estilos.letra}>
              {letra}
            </span>
          ))}
          {celdas.map((d, i) => {
            if (!d) return <span key={`v${i}`} />;
            const clases = porDia.get(d) ?? [];
            return (
              <button
                key={d}
                type="button"
                className={`${estilos.dia} ${d === hoy ? estilos.hoy : ""} ${d === dia ? estilos.elegido : ""}`}
                disabled={clases.length === 0}
                onClick={() => {
                  setDia(d === dia ? null : d);
                  setConfirmando(null);
                  setAlCalendario(null);
                }}
              >
                <span>{Number(d.slice(8))}</span>
                {clases.map((c) => (
                  <i
                    key={c.id}
                    className={`${estilos.etiquetaClase} ${c.empieza_en < ahoraIso ? estilos.pasada : ""}`}
                    style={{ background: c.color }}
                    title={c.tipo}
                  >
                    {textoHora(c.empieza_en)}
                    <b>{nombreCorto(c.tipo)}</b>
                  </i>
                ))}
              </button>
            );
          })}
        </div>

        <div className={estilos.leyenda}>
          {datos.tipos.map((tp) => (
            <span key={tp.nombre} style={{ background: tp.color }}>
              {tp.nombre}
            </span>
          ))}
        </div>
      </section>

      {dia && (
        <section className={estilos.detalle}>
          <h2>{textoDia(`${dia}T12:00:00Z`, idioma)}</h2>
          {delDia.map((r) => {
            const pasada = r.empieza_en < ahoraIso;
            const horasLimite = r.servicio === "individual" ? datos.horasIndividual : datos.horas;
            const tarde = new Date(r.empieza_en).getTime() - horasLimite * 3600 * 1000 < new Date(ahoraIso).getTime();
            return (
              <article key={r.id} className={estilos.clase} style={{ borderLeft: `6px solid ${r.color}` }}>
                <div>
                  <strong>
                    {pasada && "✓ "}
                    {r.tipo}
                  </strong>
                  <span className={estilos.pequeno}>
                    {textoHora(r.empieza_en)} – {textoHora(new Date(new Date(r.empieza_en).getTime() + (r.duracion_min || 60) * 60000).toISOString())}
                    {" · "}
                    {LUGAR_CLASES}
                  </span>
                </div>

                {!pasada && confirmando !== r.id && (
                  <div className={estilos.acciones}>
                    <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(r.id)}>
                      {t.cancelarReserva}
                    </button>
                    <button type="button" className={styles.botonSecundario} onClick={() => setAlCalendario(alCalendario === r.id ? null : r.id)}>
                      {t.alCalendario}
                    </button>
                  </div>
                )}

                {!pasada && alCalendario === r.id && (
                  <div className={estilos.acciones}>
                    <button type="button" className={styles.botonSecundario} onClick={() => descargarIcs(evento(r))}>
                      {t.calendarioMovil}
                    </button>
                    <button
                      type="button"
                      className={styles.botonSecundario}
                      onClick={() => window.open(enlaceGoogleCalendar(evento(r)), "_blank", "noopener")}
                    >
                      {t.calendarioGoogle}
                    </button>
                  </div>
                )}

                {confirmando === r.id && (
                  <div className={styles.aviso} role="alert">
                    <p style={{ margin: "0 0 10px" }}>
                      {tarde ? t.confirmaPierde.replace("{h}", String(horasLimite)) : t.confirmaDevuelve}
                    </p>
                    <div className={estilos.acciones}>
                      <button type="button" className={styles.boton} disabled={trabajando} onClick={() => cancelar(r)}>
                        {t.confirmar}
                      </button>
                      <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(null)}>
                        {t.noCancelar}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
