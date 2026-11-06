"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import MapaCorporal from "../../../MapaCorporal";
import styles from "../../admin.module.css";
import { cambiarFotoApp, quitarFotoApp } from "../../fotos/acciones";
import { prepararFoto } from "../../fotos/prepararFoto";
import ResumenIconos from "../../../rutina/ResumenIconos";
import { minutosEstimados, textoObjetivo as textoObjetivoAlumno } from "@/lib/duracion";
import { CATEGORIAS, intensidadesAgregadas } from "@/lib/ejercicios";
import type { CatalogoEjercicio, ItemRutina } from "./Constructor";

// Botón redondo pequeño con un icono (lápiz, papelera, torso…).
export function IconoBoton({
  titulo,
  onClick,
  disabled,
  children,
  peligro = false,
}: {
  titulo: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        flex: "none",
        width: 40,
        height: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        fontSize: "1.1rem",
        lineHeight: 1,
        background: "var(--blanco)",
        color: peligro ? "#b3261e" : "var(--carbon)",
        border: "1px solid var(--linea)",
        borderRadius: "50%",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

// Ventana en el centro (se cierra con la X, tocando fuera o con Escape).
export function Ventana({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [cerrar]);
  return (
    <div
      onClick={cerrar}
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(23, 24, 26, 0.45)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "min(480px, 100%)", maxHeight: "85dvh", overflowY: "auto", padding: "24px 20px", background: "var(--crema)", borderRadius: 24 }}
      >
        <button type="button" onClick={cerrar} aria-label="Cerrar" style={{ position: "absolute", top: 10, right: 10, width: 40, height: 40, background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: "50%", cursor: "pointer" }}>
          ✕
        </button>
        <h2 style={{ margin: "0 44px 12px 0", fontSize: "1.3rem" }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// Músculos y material de uno o varios ejercicios, en una ventana.
export function VentanaMusculos({ titulo, items, catalogo, cerrar }: { titulo: string; items: ItemRutina[]; catalogo: Map<string, CatalogoEjercicio>; cerrar: () => void }) {
  const intensidades = intensidadesAgregadas(items.map((i) => ({ series: i.series, musculos: catalogo.get(i.ejercicio_id)?.musculos ?? [] })));
  const materiales = [...new Set(items.flatMap((i) => catalogo.get(i.ejercicio_id)?.materiales ?? []))].sort((a, b) => a.localeCompare(b));
  return (
    <Ventana titulo={titulo} cerrar={cerrar}>
      {items.length === 0 ? <p className={styles.ayuda}>Todavía no hay ejercicios.</p> : <MapaCorporal intensidades={intensidades} />}
      <p className={styles.ayuda} style={{ marginBottom: 0 }}>
        <strong>Material:</strong> {materiales.length === 0 ? "ninguno" : materiales.join(", ")}
      </p>
    </Ventana>
  );
}

// Foto de la rutina: al pulsarla sale el menú de ver, tomar, subir o quitar.
export function FotoRutina({ rutinaId, url }: { rutinaId: string; url: string | null }) {
  return <FotoEditable destino="rutina" id={rutinaId} url={url} etiqueta="la rutina" />;
}

// Foto que se cambia ahí mismo: de la rutina, de una sesión o de un ejercicio.
export function FotoEditable({
  destino,
  id,
  url,
  etiqueta,
  tamano = 88,
  ajuste = "cover",
  aviso,
}: {
  destino: "rutina" | "sesion" | "ejercicio";
  id: string;
  url: string | null;
  etiqueta: string;
  tamano?: number;
  ajuste?: "cover" | "contain";
  aviso?: string;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [viendo, setViendo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tomar = useRef<HTMLInputElement>(null);
  const subir = useRef<HTMLInputElement>(null);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setMenu(false);
    setError(null);
    setTrabajando(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      f.append("destino", destino);
      f.append("id", id);
      const r = await cambiarFotoApp(f);
      if (!r.ok) setError(r.error ?? "No se ha podido subir la foto.");
      else router.refresh();
    } catch {
      setError("No se ha podido leer esa imagen.");
    }
    setTrabajando(false);
  }

  async function quitar() {
    setMenu(false);
    if (!window.confirm(`¿Quitar la foto de ${etiqueta}?`)) return;
    setTrabajando(true);
    const r = await quitarFotoApp(destino, id);
    if (!r.ok) setError(r.error ?? "No se ha podido quitar.");
    else router.refresh();
    setTrabajando(false);
  }

  const opcion = { display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44, padding: "0 14px", font: "inherit", textAlign: "left" as const, color: "var(--carbon)", background: "none", border: 0, cursor: "pointer" };

  return (
    <div style={{ position: "relative", flex: "none" }}>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-label={`Foto de ${etiqueta}`}
        aria-expanded={menu}
        style={{
          width: tamano,
          height: tamano,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: tamano > 60 ? "1.8rem" : "1.2rem",
          color: "var(--blanco)",
          background: url ? (ajuste === "contain" ? `url(${url}) center / contain no-repeat var(--relleno)` : `url(${url}) center / cover`) : "linear-gradient(160deg, #c9c5bd, #0aa8c0)",
          border: "1px solid var(--linea)",
          borderRadius: tamano > 60 ? 20 : 12,
          cursor: "pointer",
          opacity: trabajando ? 0.5 : 1,
        }}
      >
        <span style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{trabajando ? "…" : "📷"}</span>
      </button>
      {menu && (
        <div style={{ position: "absolute", top: tamano + 8, left: 0, zIndex: 40, width: 210, padding: "6px 0", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}>
          {aviso && <p className={styles.ayuda} style={{ margin: "4px 14px 6px" }}>{aviso}</p>}
          {url && (
            <button type="button" style={opcion} onClick={() => { setMenu(false); setViendo(true); }}>
              <span aria-hidden="true">👁</span> Ver foto
            </button>
          )}
          <button type="button" style={opcion} onClick={() => tomar.current?.click()}>
            <span aria-hidden="true">📷</span> Tomar foto
          </button>
          <button type="button" style={opcion} onClick={() => subir.current?.click()}>
            <span aria-hidden="true">📁</span> Subir foto
          </button>
          {url && (
            <>
              <div style={{ height: 1, margin: "4px 12px", background: "var(--linea)" }} />
              <button type="button" style={opcion} onClick={quitar}>
                <span aria-hidden="true">🗑</span> Quitar foto
              </button>
            </>
          )}
        </div>
      )}
      <input ref={tomar} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
      <input ref={subir} type="file" accept="image/*" hidden onChange={elegir} />
      {error && <p className={styles.error} style={{ position: "absolute", top: tamano + 8, left: 0, width: 220, zIndex: 41 }}>{error}</p>}
      {viendo && url && (
        <Ventana titulo={`Foto de ${etiqueta}`} cerrar={() => setViendo(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: "100%", borderRadius: 16 }} />
        </Ventana>
      )}
    </div>
  );
}

// Resumen de toda la rutina, siempre visible: números con iconos, material y músculos.
export function ResumenRutina({
  sesiones,
  semanas,
  entrenosSemana,
  catalogo,
}: {
  sesiones: { items: ItemRutina[] }[];
  semanas: number;
  entrenosSemana: number | null;
  catalogo: Map<string, CatalogoEjercicio>;
}) {
  const todos = sesiones.flatMap((s) => s.items);
  if (todos.length === 0) return <p className={styles.ayuda}>Añade ejercicios para ver el resumen.</p>;

  const porSesion = sesiones.map((s) => minutosEstimados(s.items));
  const minutosPorSesion = Math.round(porSesion.reduce((a, b) => a + b, 0) / Math.max(1, porSesion.length));
  const entrenos = entrenosSemana ?? sesiones.length;
  const totalMin = entrenos * semanas * minutosPorSesion;
  const series = todos.reduce((n, i) => n + i.series, 0);
  const materiales = [...new Set(todos.flatMap((i) => catalogo.get(i.ejercicio_id)?.materiales ?? []))].sort((a, b) => a.localeCompare(b));
  const categorias = [...new Set(todos.map((i) => catalogo.get(i.ejercicio_id)?.categoria).filter((c): c is string => !!c))];
  const horas = (m: number) => (m >= 120 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);

  const dato = (icono: string, valor: string, texto: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 16 }}>
      <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>
        {icono}
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <strong>{valor}</strong>
        <small style={{ color: "var(--secundario)" }}>{texto}</small>
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {dato("📅", `${entrenos} por semana`, `durante ${semanas} ${semanas === 1 ? "semana" : "semanas"}`)}
        {dato("🏋️", String(todos.length), `ejercicios en ${sesiones.length} ${sesiones.length === 1 ? "sesión" : "sesiones"}`)}
        {dato("🔁", String(series), "series en total (una semana)")}
        {dato("⏱", `~${minutosPorSesion} min`, "cada sesión")}
        {dato("⌛", `~${horas(totalMin)}`, "toda la rutina")}
        {dato("🏷", String(categorias.length), "tipos de ejercicio")}
      </div>
      <div>
        <strong>Material</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {materiales.length === 0 && <span className={styles.ayuda}>Ninguno</span>}
          {materiales.map((m) => (
            <span key={m} style={{ padding: "4px 12px", fontSize: "0.85rem", background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 999 }}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div>
        <strong>Músculos trabajados</strong>
        <MapaCorporal intensidades={intensidadesAgregadas(todos.map((i) => ({ series: i.series, musculos: catalogo.get(i.ejercicio_id)?.musculos ?? [] })))} />
      </div>
    </div>
  );
}

// Vista previa: cómo ve el/la alumno/a esta rutina (resumen y sesiones con sus ejercicios).
export function PreviaAlumno({
  nombre,
  nota,
  sesiones,
  semanas,
  entrenosSemana,
  catalogo,
  cerrar,
}: {
  nombre: string;
  nota: string | null;
  sesiones: { id: string; nombre: string; nota: string | null; items: ItemRutina[] }[];
  semanas: number;
  entrenosSemana: number | null;
  catalogo: Map<string, CatalogoEjercicio>;
  cerrar: () => void;
}) {
  const todos = sesiones.flatMap((s) => s.items);
  const materiales = [...new Set(todos.flatMap((i) => catalogo.get(i.ejercicio_id)?.materiales ?? []))].sort((a, b) => a.localeCompare(b));
  const tipos = [...new Set(todos.map((i) => catalogo.get(i.ejercicio_id)?.categoria).filter((c): c is string => !!c))].map((c) => CATEGORIAS.find((x) => x.valor === c)?.es ?? c);
  const porSemana = entrenosSemana ?? sesiones.length;

  return (
    <Ventana titulo={`Así lo ve el/la alumno/a · ${nombre}`} cerrar={cerrar}>
      {nota && <p style={{ marginTop: 0 }}>📝 {nota}</p>}
      <ResumenIconos
        idioma="es"
        datos={[
          { icono: "📅", valor: String(semanas), texto: semanas === 1 ? "semana" : "semanas" },
          { icono: "🔁", valor: String(porSemana), texto: "entrenos por semana" },
          { icono: "🏋️", valor: String(todos.length), texto: "ejercicios" },
        ]}
        tipos={tipos}
        materiales={materiales}
        intensidades={intensidadesAgregadas(todos.map((i) => ({ series: i.series, musculos: catalogo.get(i.ejercicio_id)?.musculos ?? [] })))}
      />
      {sesiones.map((s) => (
        <section key={s.id} style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 4px" }}>{s.nombre}</h3>
          <p className={styles.ayuda} style={{ margin: "0 0 8px" }}>
            ~{minutosEstimados(s.items)} min · {s.items.length} {s.items.length === 1 ? "ejercicio" : "ejercicios"}
            {s.nota ? ` · ${s.nota}` : ""}
          </p>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {s.items.map((i, n) => {
              const e = catalogo.get(i.ejercicio_id);
              return (
                <li key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "var(--blanco)", border: "1px solid var(--linea)", borderRadius: 14 }}>
                  <span style={{ width: 22, textAlign: "center", fontWeight: 700 }}>{n + 1}</span>
                  <span style={{ flex: "none", width: 56, height: 56, borderRadius: 10, background: e?.foto_url ? `url(${e.foto_url}) center / contain no-repeat var(--relleno)` : "linear-gradient(160deg, #c9c5bd, #0aa8c0)" }} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <strong>{e?.nombre ?? "Ejercicio"}</strong>
                    <small style={{ color: "var(--secundario)" }}>
                      {i.series} × {textoObjetivoAlumno(i, "rep") || "—"} · descanso {i.descanso_seg} s
                    </small>
                    {i.nota && <small>📝 {i.nota}</small>}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className={styles.ayuda} style={{ marginBottom: 0 }}>
        Esta es la versión base de la rutina; los cambios de una semana concreta se ven solo esa semana.
      </p>
    </Ventana>
  );
}
