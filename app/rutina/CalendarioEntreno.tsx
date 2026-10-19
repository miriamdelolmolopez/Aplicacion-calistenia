"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import estilos from "./ver/ver.module.css";
import { claveDia } from "@/lib/fechas";
import { diaDeLaSemana } from "@/lib/semanas";
import { createClient } from "@/lib/supabase/client";

type Datos = {
  userId: string;
  dias: number[]; // 1 = lunes … 7 = domingo
  hechos: string[]; // días con un entreno terminado
};

async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? "";
  const [{ data: entrenos }, { data: dias }] = await Promise.all([
    supabase
      .from("entrenos")
      .select("terminado_en")
      .eq("estado", "terminado")
      .order("terminado_en", { ascending: false })
      .limit(500),
    supabase.from("dias_entreno").select("dias").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    userId,
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
export default function CalendarioEntreno() {
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

  if (datos === null) return <p className={styles.aviso}>{t.cargando}</p>;

  const hoy = claveDia(new Date().toISOString());
  const mesActual = mes ?? hoy.slice(0, 7);
  const hechosDias = new Set(datos.hechos);

  const [anio, numMes] = mesActual.split("-").map(Number);
  const primero = `${mesActual}-01`;
  const diasDelMes = new Date(anio, numMes, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: diaDeLaSemana(primero) }, () => null),
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
      <h2>{t.tusDiasEntreno}</h2>
      <p className={styles.ayuda}>{t.diasAyuda}</p>
      <div className={estilos.elegirDias}>
        {LETRAS[idioma].map((letra, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={datos.dias.includes(i + 1)}
            className={datos.dias.includes(i + 1) ? estilos.diaActivo : ""}
            onClick={() => alternarDia(i + 1)}
          >
            {letra}
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
        {LETRAS[idioma].map((letra, i) => (
          <span key={i} className={estilos.letra}>
            {letra}
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
