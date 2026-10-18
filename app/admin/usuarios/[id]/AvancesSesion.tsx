"use client";

import { useEffect, useState } from "react";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import { TIPOS } from "@/lib/ejercicios";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Campo = "reps" | "segundos" | "peso_kg" | "distancia_m";

type Serie = {
  ejercicio_id: string | null;
  nombre_ejercicio: string;
  tipo: string;
  orden_ejercicio: number;
  numero: number;
  reps: number | null;
  segundos: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  completada: boolean;
};

type Entreno = {
  id: string;
  nombre_sesion: string;
  terminado_en: string;
  duracion_seg: number | null;
  entreno_series: Serie[];
};

const UNIDAD: Record<Campo, string> = { reps: "rep.", segundos: "s", peso_kg: "kg", distancia_m: "m" };

const aCampo = (c: string): Campo => (c === "peso" ? "peso_kg" : c === "distancia" ? "distancia_m" : (c as Campo));

// El dato principal de cada tipo de ejercicio (peso en los de lastre, el primero en el resto).
function campoPrincipal(tipo: string): Campo {
  if (tipo === "peso_corporal_lastre" || tipo === "repeticiones_peso") return "peso_kg";
  return aCampo(TIPOS.find((x) => x.valor === tipo)?.campos[0] ?? "reps");
}

function textoSerie(s: Serie): string {
  const partes: string[] = [];
  if (s.reps !== null) partes.push(`${s.reps}`);
  if (s.segundos !== null) partes.push(`${s.segundos}s`);
  if (s.peso_kg !== null) partes.push(`${Number(s.peso_kg)}kg`);
  if (s.distancia_m !== null) partes.push(`${s.distancia_m}m`);
  return partes.join("/") || "—";
}

async function cargar(userId: string): Promise<Entreno[]> {
  const { data } = await createClient()
    .from("entrenos")
    .select(
      "id, nombre_sesion, terminado_en, duracion_seg, entreno_series(ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero, reps, segundos, peso_kg, distancia_m, completada)",
    )
    .eq("user_id", userId)
    .eq("estado", "terminado")
    .order("terminado_en", { ascending: false })
    .limit(300);
  return ((data ?? []) as unknown as Entreno[]).map((e) => ({
    ...e,
    entreno_series: [...e.entreno_series].sort((a, b) => a.orden_ejercicio - b.orden_ejercicio || a.numero - b.numero),
  }));
}

// Mejor valor de un ejercicio en un entreno (de las series hechas).
function mejor(e: Entreno, ejercicioId: string | null, campo: Campo): number | null {
  const vals = e.entreno_series
    .filter((s) => s.completada && s.ejercicio_id === ejercicioId && s[campo] !== null)
    .map((s) => Number(s[campo]));
  return vals.length ? Math.max(...vals) : null;
}

export default function AvancesSesion({ userId }: { userId: string }) {
  const [entrenos, setEntrenos] = useState<Entreno[] | null>(null);
  const [elegida, setElegida] = useState<string>("");

  useEffect(() => {
    cargar(userId).then(setEntrenos);
  }, [userId]);

  if (entrenos === null) return <p className={styles.ayuda}>Cargando entrenos…</p>;
  if (entrenos.length === 0) return <p className={styles.ayuda}>Todavía no ha terminado ningún entreno.</p>;

  const sesiones = [...new Set(entrenos.map((e) => e.nombre_sesion))];
  const sesion = sesiones.includes(elegida) ? elegida : sesiones[0];
  // De más reciente a más antiguo.
  const delaSesion = entrenos.filter((e) => e.nombre_sesion === sesion);

  return (
    <div className={estilos.bloque}>
      <div className={estilos.sesionChips}>
        {sesiones.map((s) => (
          <button
            key={s}
            type="button"
            className={`${estilos.filtro} ${s === sesion ? estilos.filtroActivo : ""}`}
            onClick={() => setElegida(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <p className={styles.ayuda}>
        Cada vez que ha hecho «{sesion}» ({delaSesion.length}). Las flechas comparan con la vez anterior: ▲ mejora ·
        ▼ baja.
      </p>

      {delaSesion.map((e, i) => {
        const anterior = delaSesion[i + 1];
        const hechas = e.entreno_series.filter((s) => s.completada);
        const ejercicios = [...new Map(hechas.map((s) => [s.orden_ejercicio, s])).values()];
        return (
          <article key={e.id} className={estilos.entreno}>
            <h4>
              {fechaCorta(e.terminado_en)}
              {e.duracion_seg ? ` · ${Math.round(e.duracion_seg / 60)} min` : ""} · {hechas.length}/
              {e.entreno_series.length} series
            </h4>
            {ejercicios.map((ej) => {
              const campo = campoPrincipal(ej.tipo);
              const series = hechas.filter((s) => s.orden_ejercicio === ej.orden_ejercicio);
              const ahora = mejor(e, ej.ejercicio_id, campo);
              const antes = anterior ? mejor(anterior, ej.ejercicio_id, campo) : null;
              const dif = ahora !== null && antes !== null ? Math.round((ahora - antes) * 100) / 100 : null;
              return (
                <div key={ej.orden_ejercicio} className={estilos.ejercicio}>
                  <span>
                    <strong>{ej.nombre_ejercicio}</strong> · {series.map(textoSerie).join("  ")}
                  </span>
                  <span className={dif === null ? estilos.igual : dif > 0 ? estilos.sube : dif < 0 ? estilos.baja : estilos.igual}>
                    {dif === null ? "" : dif > 0 ? `▲ +${dif} ${UNIDAD[campo]}` : dif < 0 ? `▼ ${dif} ${UNIDAD[campo]}` : "="}
                  </span>
                </div>
              );
            })}
          </article>
        );
      })}
    </div>
  );
}
