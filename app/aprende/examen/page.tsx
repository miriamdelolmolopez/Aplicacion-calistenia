"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { useIdioma } from "../../useIdioma";
import estilos from "../aprende.module.css";
import { textosAprende } from "../textosAprende";
import { createClient } from "@/lib/supabase/client";

type Pregunta = {
  id: string;
  pregunta_es: string;
  pregunta_en: string | null;
  opciones_es: string[];
  opciones_en: string[] | null;
  correcta: number;
  explicacion_es: string | null;
  explicacion_en: string | null;
};

// Una pregunta lista para mostrar: opciones ya mezcladas y la posición de la correcta.
type Lista = { id: string; pregunta: string; opciones: string[]; correcta: number; explicacion: string | null };

const mezclar = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Examen() {
  const [idioma] = useIdioma();
  const t = textosAprende[idioma];
  const [banco, setBanco] = useState<Pregunta[] | null>(null);
  const [cuantas, setCuantas] = useState<number | null>(null);
  const [examen, setExamen] = useState<Lista[] | null>(null);
  const [actual, setActual] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [respuestas, setRespuestas] = useState<(number | null)[]>([]);
  const [viendoResultado, setViendoResultado] = useState(false);

  useEffect(() => {
    createClient()
      .from("preguntas")
      .select("id, pregunta_es, pregunta_en, opciones_es, opciones_en, correcta, explicacion_es, explicacion_en")
      .eq("activa", true)
      .then(({ data }) => setBanco((data ?? []) as Pregunta[]));
  }, []);

  const total = banco?.length ?? 0;
  const opcionesNumero = [5, 10, 15, 20].filter((n) => n < total);

  function empezar(n: number) {
    if (!banco) return;
    const elegidas = mezclar(banco)
      .slice(0, n)
      .map((p): Lista => {
        const usaEn = idioma === "en" && p.opciones_en !== null && p.opciones_en.length === p.opciones_es.length;
        const ops = (usaEn ? (p.opciones_en as string[]) : p.opciones_es).map((texto, i) => ({ texto, correcta: i === p.correcta }));
        const mezcladas = mezclar(ops);
        return {
          id: p.id,
          pregunta: (idioma === "en" && p.pregunta_en) || p.pregunta_es,
          opciones: mezcladas.map((o) => o.texto),
          correcta: mezcladas.findIndex((o) => o.correcta),
          explicacion: (idioma === "en" && p.explicacion_en) || p.explicacion_es,
        };
      });
    setExamen(elegidas);
    setActual(0);
    setElegida(null);
    setRespuestas([]);
    setViendoResultado(false);
  }

  function elegir(i: number) {
    if (elegida !== null) return;
    setElegida(i);
    setRespuestas((r) => [...r, i]);
  }

  function siguiente() {
    setElegida(null);
    setActual((a) => a + 1);
  }

  // ---- Elegir cuántas preguntas ----
  if (examen === null) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/aprende", texto: "volver" }} />
        <h1 style={{ margin: "12px 0 14px", fontSize: "2rem" }}>{t.examen}</h1>
        {banco === null && <p className={styles.aviso}>{t.cargando}</p>}
        {banco !== null && total === 0 && <p className={styles.aviso}>{t.sinPreguntas}</p>}
        {total > 0 && (
          <section className={estilos.seccion}>
            <h2>{t.cuantas}</h2>
            <div className={estilos.numeros}>
              {[...opcionesNumero, total].map((n) => (
                <button key={n} type="button" className={cuantas === n ? estilos.elegido : ""} onClick={() => setCuantas(n)}>
                  {n === total ? `${t.todas} (${n})` : n}
                </button>
              ))}
            </div>
            <button type="button" className={styles.boton} disabled={cuantas === null} onClick={() => cuantas && empezar(cuantas)}>
              {t.empezar}
            </button>
          </section>
        )}
      </main>
    );
  }

  // ---- Resultado ----
  if (viendoResultado) {
    const aciertos = examen.filter((p, i) => respuestas[i] === p.correcta).length;
    const fallos = examen.map((p, i) => ({ p, i })).filter(({ p, i }) => respuestas[i] !== p.correcta);
    const porcentaje = aciertos / examen.length;
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/aprende", texto: "volver" }} />
        <h1 style={{ margin: "12px 0 14px", fontSize: "2rem" }}>{t.resultado}</h1>
        <section className={estilos.seccion}>
          <div className={estilos.nota}>
            {aciertos}/{examen.length}
          </div>
          <p style={{ textAlign: "center" }}>{porcentaje === 1 ? t.excelente : porcentaje >= 0.6 ? t.bien : t.sigue}</p>
          {fallos.length > 0 && (
            <>
              <h2 style={{ fontSize: "1.2rem" }}>{t.repasa}</h2>
              {fallos.map(({ p, i }) => (
                <div key={p.id} className={estilos.repaso} style={{ marginBottom: 10 }}>
                  <strong>{p.pregunta}</strong>
                  <p>
                    {t.tuRespuesta}: {respuestas[i] !== null && respuestas[i] !== undefined ? p.opciones[respuestas[i] as number] : "—"}
                  </p>
                  <p>
                    {t.respuestaEra}: <strong>{p.opciones[p.correcta]}</strong>
                  </p>
                  {p.explicacion && <p>{p.explicacion}</p>}
                </div>
              ))}
            </>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            <button type="button" className={styles.boton} onClick={() => empezar(examen.length)}>
              {t.repetir}
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setExamen(null)}>
              {t.cambiar}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ---- Pregunta ----
  const p = examen[actual];
  const ultima = actual === examen.length - 1;
  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/aprende", texto: "volver" }} />
      <p style={{ margin: "12px 0 6px", color: "var(--secundario)" }}>
        {t.pregunta} {actual + 1} {t.de} {examen.length}
      </p>
      <div className={estilos.barra} role="progressbar" aria-valuemin={0} aria-valuemax={examen.length} aria-valuenow={actual + 1}>
        <div style={{ width: `${((actual + (elegida !== null ? 1 : 0)) / examen.length) * 100}%` }} />
      </div>

      <section className={estilos.seccion} style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: "1.4rem" }}>{p.pregunta}</h2>
        <div className={estilos.respuestas}>
          {p.opciones.map((o, i) => {
            const marca = elegida === null ? "" : i === p.correcta ? estilos.bien : i === elegida ? estilos.mal : "";
            return (
              <button key={i} type="button" className={marca} disabled={elegida !== null} onClick={() => elegir(i)}>
                {o}
              </button>
            );
          })}
        </div>
        {elegida !== null && (
          <>
            <p role="status">
              <strong>{elegida === p.correcta ? t.correcto : t.incorrecto}</strong>{" "}
              {elegida !== p.correcta && (
                <>
                  {t.respuestaEra}: {p.opciones[p.correcta]}.
                </>
              )}
            </p>
            {p.explicacion && <p>{p.explicacion}</p>}
            <button type="button" className={styles.boton} onClick={ultima ? () => setViendoResultado(true) : siguiente}>
              {ultima ? t.verResultado : t.siguiente}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
