"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { fechaLarga, nombreEstado, ordenadas, porEjercicio, SELECCION_ENTRENO, textoHecho, textoObjetivo, tiempo, tiempoHastaSiguiente, totales, type Entreno } from "@/lib/entrenoDocumento";
import styles from "../../../admin.module.css";
import PanelCompleto from "../../../comunes/PanelCompleto";
import { guardarEntreno, type CambioSerie } from "./acciones";

async function cargar(id: string): Promise<Entreno | null> {
  const { data } = await createClient().from("entrenos").select(SELECCION_ENTRENO).eq("id", id).maybeSingle();
  return (data as unknown as Entreno | null) ?? null;
}

function useEntreno(id: string) {
  const [entreno, setEntreno] = useState<Entreno | null | undefined>(undefined);
  useEffect(() => {
    cargar(id).then(setEntreno);
  }, [id]);
  return entreno;
}

const Dato = ({ titulo, valor }: { titulo: string; valor: string }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 110 }}>
    <span className={styles.ayuda} style={{ margin: 0 }}>
      {titulo}
    </span>
    <strong>{valor}</strong>
  </div>
);

// Todo lo que hizo en un entreno: duración, series de cada ejercicio, lo conseguido, descansos y esfuerzo.
export function VerEntreno({ id, nombre, cerrar }: { id: string; nombre: string; cerrar: () => void }) {
  const entreno = useEntreno(id);
  const t = entreno ? totales(entreno) : null;
  const pausas = entreno ? tiempoHastaSiguiente(entreno.entreno_series) : new Map<string, number>();

  return (
    <PanelCompleto titulo={nombre} cerrar={cerrar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {entreno === undefined && <p className={styles.ayuda}>Cargando…</p>}
        {entreno === null && <p className={styles.error}>No se ha podido abrir el entreno.</p>}
        {entreno && t && (
          <>
            <section className={styles.tarjeta}>
              <p style={{ margin: "0 0 4px", textTransform: "capitalize" }}>{fechaLarga(entreno.empezado_en)}</p>
              <p className={styles.ayuda} style={{ margin: "0 0 12px" }}>
                {entreno.nombre_rutina} · {nombreEstado(entreno.estado)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px" }}>
                <Dato titulo="Duración" valor={tiempo(entreno.duracion_seg)} />
                <Dato titulo="Series hechas" valor={`${t.hechas} de ${t.series}`} />
                <Dato titulo="Repeticiones" valor={String(t.reps)} />
                {t.segundos > 0 && <Dato titulo="Tiempo de trabajo" valor={tiempo(t.segundos)} />}
                {t.kilos > 0 && <Dato titulo="Carga total" valor={`${Math.round(t.kilos)} kg`} />}
                <Dato titulo="Descanso pautado" valor={tiempo(t.descansoPautado)} />
              </div>
            </section>

            {porEjercicio(entreno.entreno_series).map((g, i) => (
              <section key={`${i}-${g.nombre}`} className={styles.tarjeta}>
                <h2>
                  {i + 1}. {g.nombre}
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th style={{ padding: "4px 8px 4px 0" }}>Serie</th>
                        <th style={{ padding: "4px 8px" }}>Hecho</th>
                        <th style={{ padding: "4px 8px" }}>Objetivo</th>
                        <th style={{ padding: "4px 8px" }}>Descanso pautado</th>
                        <th style={{ padding: "4px 8px" }} title="Desde que acaba esta serie hasta que acaba la siguiente (incluye el descanso)">
                          Hasta la siguiente
                        </th>
                        <th style={{ padding: "4px 0 4px 8px" }}>Esfuerzo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.series.map((s) => (
                        <tr key={s.id} style={{ borderTop: "1px solid rgba(0,0,0,0.08)", opacity: s.completada ? 1 : 0.55 }}>
                          <td style={{ padding: "6px 8px 6px 0" }}>{s.numero}</td>
                          <td style={{ padding: "6px 8px" }}>{s.completada ? textoHecho(s) : "sin hacer"}</td>
                          <td style={{ padding: "6px 8px" }}>{textoObjetivo(s)}</td>
                          <td style={{ padding: "6px 8px" }}>{s.descanso_seg} s</td>
                          <td style={{ padding: "6px 8px" }}>{pausas.has(s.id) ? tiempo(pausas.get(s.id)) : "—"}</td>
                          <td style={{ padding: "6px 0 6px 8px" }}>{s.rpe != null ? `${s.rpe}/10` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {g.series.some((s) => s.detalle?.trim()) && (
                  <p className={styles.ayuda} style={{ margin: "8px 0 0" }}>
                    {g.series
                      .filter((s) => s.detalle?.trim())
                      .map((s) => `Serie ${s.numero}: ${s.detalle}`)
                      .join(" · ")}
                  </p>
                )}
              </section>
            ))}
            {entreno.entreno_series.length === 0 && <p className={styles.ayuda}>Este entreno no tiene series anotadas.</p>}
          </>
        )}
      </div>
    </PanelCompleto>
  );
}

type Edicion = Record<string, { reps: string; segundos: string; peso: string; distancia: string; completada: boolean }>;
const aNumero = (t: string): number | null => (t.trim() === "" || Number.isNaN(Number(t.replace(",", "."))) ? null : Number(t.replace(",", ".")));

// Corregir un entreno: su nombre, su duración y lo anotado en cada serie.
export function EditarEntreno({ id, nombre, cerrar }: { id: string; nombre: string; cerrar: () => void }) {
  const router = useRouter();
  const entreno = useEntreno(id);
  const [titulo, setTitulo] = useState<string | null>(null);
  const [minutos, setMinutos] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion>({});
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  const nombreActual = titulo ?? entreno?.nombre_sesion ?? nombre;
  const minutosActual = minutos ?? (entreno?.duracion_seg != null ? String(Math.round((entreno.duracion_seg / 60) * 10) / 10) : "");
  const valor = (s: Entreno["entreno_series"][number]) =>
    edicion[s.id] ?? { reps: s.reps?.toString() ?? "", segundos: s.segundos?.toString() ?? "", peso: s.peso_kg != null ? String(Number(s.peso_kg)) : "", distancia: s.distancia_m?.toString() ?? "", completada: s.completada };
  const cambiar = (s: Entreno["entreno_series"][number], campo: keyof Edicion[string], v: string | boolean) => setEdicion({ ...edicion, [s.id]: { ...valor(s), [campo]: v } });

  function guardar() {
    if (!entreno) return;
    setError("");
    const cambios: CambioSerie[] = entreno.entreno_series.map((s) => {
      const v = valor(s);
      return { id: s.id, reps: aNumero(v.reps), segundos: aNumero(v.segundos), peso_kg: aNumero(v.peso), distancia_m: aNumero(v.distancia), completada: v.completada };
    });
    empezar(async () => {
      const r = await guardarEntreno(id, aNumero(minutosActual), nombreActual, cambios);
      if (r.error) return setError(r.error);
      router.refresh();
      cerrar();
    });
  }

  const caja: React.CSSProperties = { width: 70, padding: "6px 8px", font: "inherit", border: "1px solid rgba(0,0,0,0.2)", borderRadius: 8 };

  return (
    <PanelCompleto titulo={`Editar · ${nombre}`} cerrar={cerrar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {entreno === undefined && <p className={styles.ayuda}>Cargando…</p>}
        {entreno === null && <p className={styles.error}>No se ha podido abrir el entreno.</p>}
        {entreno && (
          <>
            <section className={styles.tarjeta}>
              <div className={styles.campo}>
                <label htmlFor="ent-nombre">Nombre del entreno</label>
                <input id="ent-nombre" value={nombreActual} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
              </div>
              <div className={styles.campo}>
                <label htmlFor="ent-min">Duración (minutos)</label>
                <input id="ent-min" inputMode="decimal" value={minutosActual} onChange={(e) => setMinutos(e.target.value)} style={{ maxWidth: 140 }} />
              </div>
            </section>

            {porEjercicio(ordenadas(entreno.entreno_series)).map((g, i) => (
              <section key={`${i}-${g.nombre}`} className={styles.tarjeta}>
                <h2>
                  {i + 1}. {g.nombre}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {g.series.map((s) => {
                    const v = valor(s);
                    return (
                      <div key={s.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <strong style={{ width: 62 }}>Serie {s.numero}</strong>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                          Reps <input inputMode="numeric" value={v.reps} onChange={(e) => cambiar(s, "reps", e.target.value)} style={caja} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                          Seg <input inputMode="numeric" value={v.segundos} onChange={(e) => cambiar(s, "segundos", e.target.value)} style={caja} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                          Kg <input inputMode="decimal" value={v.peso} onChange={(e) => cambiar(s, "peso", e.target.value)} style={caja} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                          Metros <input inputMode="numeric" value={v.distancia} onChange={(e) => cambiar(s, "distancia", e.target.value)} style={caja} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={v.completada} onChange={(e) => cambiar(s, "completada", e.target.checked)} /> Hecha
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div>
              <button type="button" className={styles.boton} disabled={pendiente} onClick={guardar}>
                {pendiente ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </>
        )}
      </div>
    </PanelCompleto>
  );
}
