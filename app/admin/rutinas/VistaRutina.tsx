"use client";

import { useEffect, useState } from "react";
import { intensidadesAgregadas } from "@/lib/ejercicios";
import { createClient } from "@/lib/supabase/client";
import MapaCorporal from "../../MapaCorporal";
import styles from "../admin.module.css";
import PanelCompleto from "../comunes/PanelCompleto";
import BotonDocumento from "../../rutina/BotonDocumento";

type Item = {
  id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  descanso_seg: number;
  nota: string | null;
  ejercicios: {
    nombre: string;
    ejercicio_musculos: { musculo: string; rol: string }[];
    ejercicio_materiales: { materiales: { nombre: string } | null }[];
  } | null;
};
type Sesion = { id: string; nombre: string; orden: number; archivada?: boolean; rutina_items: Item[] };
type Rutina = { nombre: string; semanas: number; entrenos_semana: number | null; rutina_sesiones: Sesion[] };

const rango = (min: number | null, max: number | null, unidad: string) => {
  if (min == null && max == null) return "";
  const a = min ?? max;
  return max != null && min != null && max !== min ? `${a}-${max}${unidad}` : `${a}${unidad}`;
};

// Resumen de una rutina tal y como la vería la alumna (solo para mirar).
export default function VistaRutina({ id, nombre, alumno, cerrar }: { id: string; nombre: string; alumno: string; cerrar: () => void }) {
  const [rutina, setRutina] = useState<Rutina | null | undefined>(undefined);

  useEffect(() => {
    createClient()
      .from("rutinas")
      .select(
        "nombre, semanas, entrenos_semana, rutina_sesiones(id, nombre, orden, archivada, rutina_items(id, orden, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, descanso_seg, nota, ejercicios(nombre, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre)))))",
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setRutina((data as unknown as Rutina | null) ?? null));
  }, [id]);

  const sesiones = [...(rutina?.rutina_sesiones ?? [])]
    .filter((s) => !s.archivada)
    .sort((a, b) => a.orden - b.orden)
    .map((s) => ({ ...s, rutina_items: [...s.rutina_items].sort((a, b) => a.orden - b.orden) }));
  const items = sesiones.flatMap((s) => s.rutina_items);
  const materiales = [...new Set(items.flatMap((i) => (i.ejercicios?.ejercicio_materiales ?? []).map((m) => m.materiales?.nombre ?? "").filter(Boolean)))].sort((a, b) => a.localeCompare(b, "es"));
  const intensidades = intensidadesAgregadas(items.map((i) => ({ series: i.series, musculos: i.ejercicios?.ejercicio_musculos ?? [] })));

  return (
    <PanelCompleto titulo={nombre} cerrar={cerrar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p className={styles.ayuda} style={{ margin: 0, flex: 1 }}>
            Así la ve {alumno}. Solo para mirar: para cambiar algo, usa el lápiz.
          </p>
          <BotonDocumento id={id} />
        </div>
        {rutina === undefined && <p className={styles.ayuda}>Cargando…</p>}
        {rutina === null && <p className={styles.error}>No se ha podido abrir la rutina.</p>}
        {rutina && (
          <>
            <section className={styles.tarjeta}>
              <p style={{ margin: 0 }}>
                <strong>{rutina.semanas}</strong> {rutina.semanas === 1 ? "semana" : "semanas"} · <strong>{rutina.entrenos_semana ?? sesiones.length}</strong> entrenos por semana · <strong>{items.length}</strong>{" "}
                ejercicios
              </p>
              <p className={styles.ayuda} style={{ margin: "6px 0 0" }}>
                <strong>Material:</strong> {materiales.join(", ") || "no hace falta"}
              </p>
            </section>

            <section className={styles.tarjeta}>
              <h2>Músculos trabajados</h2>
              <MapaCorporal intensidades={intensidades} etiquetas={{ frente: "Frente", espalda: "Espalda" }} />
            </section>

            {sesiones.map((s) => (
              <section key={s.id} className={styles.tarjeta}>
                <h2>{s.nombre}</h2>
                {s.rutina_items.length === 0 && <p className={styles.ayuda}>Sin ejercicios.</p>}
                <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.rutina_items.map((i) => {
                    const medida = [rango(i.reps_min, i.reps_max, " reps"), rango(i.segundos_min, i.segundos_max, " s"), i.peso_kg ? `${i.peso_kg} kg` : ""].filter(Boolean).join(" · ");
                    return (
                      <li key={i.id}>
                        <strong>{i.ejercicios?.nombre ?? "Ejercicio"}</strong>
                        <div className={styles.ayuda}>
                          {i.series} {i.series === 1 ? "serie" : "series"}
                          {medida && ` × ${medida}`} · descanso {i.descanso_seg} s
                        </div>
                        {i.nota && <div className={styles.ayuda}>«{i.nota}»</div>}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </>
        )}
      </div>
    </PanelCompleto>
  );
}
