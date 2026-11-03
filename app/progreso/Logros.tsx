"use client";

import { useEffect, useState } from "react";
import { BarrasColores, PALETA, TarjetaCifra } from "../admin/informes/GraficosPagos";
import { useIdioma } from "../useIdioma";
import { useNombresEn } from "../useNombresEn";
import { colorDeTipo } from "@/lib/colores";
import { fechaCorta } from "@/lib/fechas";
import { calcularLogros, type Logros as DatosLogros, type ReservaLogro } from "@/lib/logros";
import { createClient } from "@/lib/supabase/client";
import estilos from "./logros.module.css";

type Fila = {
  estado: string;
  asistencia: string | null;
  sesiones_clase: { empieza_en: string; estado: string; tipos_clase: { nombre: string; color: string | null } | null } | null;
};

const DIAS = {
  es: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

// Textos. La alumna se ve a sí misma; en la ficha de Miriam se habla de ella en tercera persona.
function textos(idioma: "es" | "en", admin: boolean) {
  const es = idioma === "es";
  return {
    titulo: es ? "Logros" : "Achievements",
    sinDatos: es ? (admin ? "Todavía no ha ido a ninguna clase." : "Cuando vayas a tu primera clase, aquí verás tus logros.") : admin ? "She has not been to any class yet." : "Once you go to your first class, your achievements will show up here.",
    mes: es ? "Clases este mes" : "Classes this month",
    igual: es ? "Igual que el mes pasado" : "Same as last month",
    mas: (n: number) => (es ? `▲ ${n} más que el mes pasado` : `▲ ${n} more than last month`),
    menos: (n: number) => (es ? `▼ ${n} menos que el mes pasado` : `▼ ${n} fewer than last month`),
    racha: es ? "Racha" : "Streak",
    semanas: (n: number) => (es ? `${n === 1 ? "semana" : "semanas"} seguidas con clase` : `${n === 1 ? "week" : "weeks"} in a row with a class`),
    mejor: (n: number) => (es ? `Mejor racha: ${n}` : `Best streak: ${n}`),
    total: es ? "Clases en total" : "Classes in total",
    asistencia: es ? "Asistencia" : "Attendance",
    faltas: (n: number) => (es ? `${n} ${n === 1 ? "falta" : "faltas"}` : `${n} missed`),
    medallas: es ? "Medallas" : "Medals",
    conseguida: (f: string) => (es ? `Conseguida el ${f}` : `Earned on ${f}`),
    faltan: (n: number) => (es ? `Faltan ${n}` : `${n} to go`),
    medallaTitulo: (clave: string, meta: number) =>
      clave === "clases" ? (meta === 1 ? (es ? "Primera clase" : "First class") : es ? `${meta} clases` : `${meta} classes`) : clave === "racha" ? (es ? `Racha de ${meta} semanas` : `${meta}-week streak`) : es ? "Mes completo" : "Full month",
    medallaAyuda: (clave: string, meta: number) =>
      clave === "clases" ? (es ? `Llegar a ${meta} ${meta === 1 ? "clase" : "clases"}` : `Reach ${meta} ${meta === 1 ? "class" : "classes"}`) : clave === "racha" ? (es ? `${meta} semanas seguidas con clase` : `${meta} weeks in a row`) : es ? `${meta} clases en un mismo mes` : `${meta} classes in one month`,
    resumen: (l: DatosLogros, dias: string[]) => {
      const clases = l.mesActual === 1 ? (es ? "clase" : "class") : es ? "clases" : "classes";
      const d = l.mesActual - l.mesAnterior;
      const comp = l.mesAnterior === 0 && l.mesActual === 0 ? "" : d === 0 ? (es ? ", igual que el mes pasado" : ", the same as last month") : d > 0 ? (es ? `, ${d} más que el mes pasado` : `, ${d} more than last month`) : es ? `, ${-d} menos que el mes pasado` : `, ${-d} fewer than last month`;
      const sujeto = es ? (admin ? "Este mes ha hecho" : "Este mes has hecho") : admin ? "This month she has done" : "This month you have done";
      const fav = l.tipoFavorito ? (es ? ` ${admin ? "Su" : "Tu"} clase favorita: ${l.tipoFavorito}.` : ` ${admin ? "Her" : "Your"} favourite class: ${l.tipoFavorito}.`) : "";
      const fuerte = l.diaFuerte !== null ? (es ? ` ${admin ? "Su" : "Tu"} día fuerte: el ${dias[l.diaFuerte]}.` : ` ${admin ? "Her" : "Your"} strongest day: ${dias[l.diaFuerte]}.`) : "";
      return `${sujeto} ${l.mesActual} ${clases}${comp}.${fav}${fuerte}`;
    },
    porTipo: es ? "Clases por tipo" : "Classes by type",
    porDia: es ? "Clases por día de la semana" : "Classes by day of the week",
  };
}

// Logros de una persona. userId: la ficha de Miriam; sin userId, la propia persona. El % de asistencia solo lo ve Miriam.
export default function Logros({ userId, admin = false }: { userId?: string; admin?: boolean }) {
  const [idioma] = useIdioma();
  const tr = useNombresEn();
  const t = textos(idioma, admin);
  const dias = DIAS[idioma];
  const [datos, setDatos] = useState<DatosLogros | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let consulta = createClient()
        .from("reservas")
        .select("estado, asistencia, sesiones_clase(empieza_en, estado, tipos_clase(nombre, color))")
        .eq("estado", "reservada")
        .limit(2000);
      if (userId) consulta = consulta.eq("user_id", userId);
      const { data } = await consulta;
      const filas: ReservaLogro[] = ((data ?? []) as unknown as Fila[])
        .filter((r) => r.sesiones_clase)
        .map((r) => {
          const s = r.sesiones_clase!;
          const nombre = s.tipos_clase?.nombre ?? (idioma === "es" ? "Clase" : "Class");
          return { estado: r.estado, asistencia: r.asistencia, empieza_en: s.empieza_en, sesion_estado: s.estado, tipo: nombre, color: colorDeTipo(s.tipos_clase?.color, nombre) };
        });
      if (vivo) setDatos(calcularLogros(filas));
    })();
    return () => {
      vivo = false;
    };
  }, [userId, idioma]);

  if (datos === null) return null;
  const l = datos;
  const dif = l.mesActual - l.mesAnterior;

  return (
    <section className={estilos.seccion} aria-label={t.titulo}>
      <h2 className={estilos.titulo}>{t.titulo}</h2>
      {l.total === 0 ? (
        <p className={estilos.ayuda}>{t.sinDatos}</p>
      ) : (
        <>
          <div className={estilos.tarjetas}>
            <TarjetaCifra titulo={t.mes} valor={String(l.mesActual)} color="#0aa8c0" notas={<span>{dif === 0 ? t.igual : dif > 0 ? t.mas(dif) : t.menos(-dif)}</span>} />
            <TarjetaCifra
              titulo={t.racha}
              valor={String(l.rachaActual)}
              color="#6d5efc"
              notas={
                <>
                  <span>{t.semanas(l.rachaActual)}</span>
                  <span>{t.mejor(l.mejorRacha)}</span>
                </>
              }
            />
            <TarjetaCifra titulo={t.total} valor={String(l.total)} color="#2fb57a" notas={<span>&nbsp;</span>} />
            {admin && l.asistenciaPct !== null && <TarjetaCifra titulo={t.asistencia} valor={`${l.asistenciaPct} %`} color="#f5a524" notas={<span>{t.faltas(l.faltas)}</span>} />}
          </div>

          <p className={estilos.resumen}>{t.resumen(l, dias)}</p>

          <h3 className={estilos.subtitulo}>{t.medallas}</h3>
          <ul className={estilos.medallas}>
            {l.medallas.map((m) => {
              const lograda = m.conseguidaEn !== null;
              return (
                <li key={m.id} className={`${estilos.medalla} ${lograda ? "" : estilos.bloqueada}`}>
                  <span className={estilos.icono} aria-hidden="true">
                    {m.clave === "racha" ? "🔥" : m.clave === "mes" ? "★" : m.meta}
                  </span>
                  <strong>{t.medallaTitulo(m.clave, m.meta)}</strong>
                  <small>{lograda ? t.conseguida(fechaCorta(`${m.conseguidaEn}T12:00:00Z`, idioma)) : `${t.medallaAyuda(m.clave, m.meta)} · ${t.faltan(Math.max(m.meta - m.valor, 0))}`}</small>
                </li>
              );
            })}
          </ul>

          <div className={estilos.bloque}>
            <h3 className={estilos.subtitulo}>{t.porTipo}</h3>
            <BarrasColores formato={String} filas={l.porTipo.map((x, i) => ({ texto: tr(x.tipo), valor: x.clases, color: x.color ?? PALETA[i % PALETA.length] }))} />
          </div>
          <div className={estilos.bloque}>
            <h3 className={estilos.subtitulo}>{t.porDia}</h3>
            <BarrasColores porcentaje={false} formato={String} filas={dias.map((d, i) => ({ texto: d.charAt(0).toUpperCase() + d.slice(1), valor: l.porDia[i], color: PALETA[i % PALETA.length] }))} />
          </div>
        </>
      )}
    </section>
  );
}
