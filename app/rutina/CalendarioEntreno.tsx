"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import estilos from "./ver/ver.module.css";
import { claveDia } from "@/lib/fechas";
import { diaDeLaSemana } from "@/lib/semanas";
import { diaInicioSemana, NOMBRES_DIAS } from "@/lib/diaInicioSemana";
import { createClient } from "@/lib/supabase/client";
import Cargando from "../Cargando";
import { leerComo } from "./useComo";

type Datos = {
  userId: string;
  dias: number[]; // 1 = lunes … 7 = domingo
  hechos: string[]; // días con un entreno terminado
  inicio: number; // día en que empieza su semana (0 = lunes … 6 = domingo)
  soloLectura: boolean; // la administradora viendo a otra persona: no se cambia
};

async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const como = leerComo();
  const userId = como ?? auth.user?.id ?? "";
  const [{ data: entrenos }, { data: dias }] = await Promise.all([
    supabase
      .from("entrenos")
      .select("terminado_en")
      .eq("user_id", userId)
      .eq("estado", "terminado")
      .order("terminado_en", { ascending: false })
      .limit(500),
    supabase.from("dias_entreno").select("dias").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    userId,
    inicio: await diaInicioSemana(supabase, userId),
    soloLectura: !!como,
    dias: ((dias as { dias: number[] } | null)?.dias ?? []).slice().sort(),
    hechos: ((entrenos ?? []) as { terminado_en: string | null }[])
      .filter((e) => e.terminado_en)
      .map((e) => claveDia(e.terminado_en as string)),
  };
}

const LETRAS = {
  es: ["L", "M", "X", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

// Los días de entreno de la semana y el calendario del mes (hechos y previstos).
export default function CalendarioEntreno({ alCambiarInicio }: { alCambiarInicio?: () => void }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [mes, setMes] = useState<string | null>(null); // AAAA-MM
  // Los días elegidos hasta el momento (así dos toques seguidos no se pisan).
  const diasRef = useRef<number[]>([]);

  useEffect(() => {
    obtenerDatos().then((d) => {
      diasRef.current = d.dias;
      setDatos(d);
    });
  }, []);

  async function alternarDia(isoDia: number) {
    if (!datos) return;
    const actuales = diasRef.current;
    const nuevos = actuales.includes(isoDia) ? actuales.filter((d) => d !== isoDia) : [...actuales, isoDia].sort();
    diasRef.current = nuevos;
    setDatos((d) => (d ? { ...d, dias: nuevos } : d));
    await createClient().from("dias_entreno").upsert({ user_id: datos.userId, dias: nuevos, actualizado_en: new Date().toISOString() });
  }

  async function cambiarInicio(nuevo: number) {
    if (!datos || datos.soloLectura) return;
    setDatos({ ...datos, inicio: nuevo });
    const { error } = await createClient().from("profiles").update({ dia_inicio_semana: nuevo }).eq("id", datos.userId);
    if (!error) alCambiarInicio?.();
  }

  if (datos === null) return <Cargando />;

  // Las letras empiezan por el día que la persona ha elegido como inicio de su semana.
  const orden = Array.from({ length: 7 }, (_, k) => (datos.inicio + k) % 7);

  const hoy = claveDia(new Date().toISOString());
  const mesActual = mes ?? hoy.slice(0, 7);
  const hechosDias = new Set(datos.hechos);

  const [anio, numMes] = mesActual.split("-").map(Number);
  const primero = `${mesActual}-01`;
  const diasDelMes = new Date(anio, numMes, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: (diaDeLaSemana(primero) - datos.inicio + 7) % 7 }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => `${mesActual}-${String(i + 1).padStart(2, "0")}`),
  ];
  const cambiarMes = (n: number) => {
    const d = new Date(anio, numMes - 1 + n, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nombreMes = new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric" }).format(
    new Date(anio, numMes - 1, 1),
  );

  return (
    <section className={estilos.calendario}>
      <div className={estilos.cabeceraCal}>
        <h2>{t.tusDiasEntreno}</h2>
        <label className={estilos.inicioSemana} title={idioma === "en" ? "The week starts on" : "La semana empieza el"}>
          <span>{idioma === "en" ? "Starts" : "Empieza"}</span>
          <select
            value={datos.inicio}
            disabled={datos.soloLectura}
            aria-label={idioma === "en" ? "First day of the week" : "Primer día de la semana"}
            onChange={(e) => cambiarInicio(Number(e.target.value))}
          >
            {LETRAS[idioma].map((letra, i) => (
              <option key={i} value={i} title={NOMBRES_DIAS[idioma][i]}>
                {letra}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.ayuda}>{t.diasAyuda}</p>
      <div className={estilos.elegirDias}>
        {orden.map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={datos.dias.includes(i + 1)}
            className={datos.dias.includes(i + 1) ? estilos.diaActivo : ""}
            onClick={() => alternarDia(i + 1)}
          >
            {LETRAS[idioma][i]}
          </button>
        ))}
      </div>

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
        {orden.map((i) => (
          <span key={i} className={estilos.letra}>
            {LETRAS[idioma][i]}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const hecho = hechosDias.has(d);
          const previsto = !hecho && d >= hoy && datos.dias.includes(diaDeLaSemana(d) + 1);
          return (
            <span
              key={d}
              className={`${estilos.dia} ${hecho ? estilos.diaHecho : ""} ${previsto ? estilos.diaPrevisto : ""} ${d === hoy ? estilos.hoy : ""}`}
            >
              {hecho ? "✓" : Number(d.slice(8))}
            </span>
          );
        })}
      </div>
    </section>
  );
}
