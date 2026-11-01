"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import MapaCorporal from "../../MapaCorporal";
import { useIdioma } from "../../useIdioma";
import VideoEjercicio from "../../VideoEjercicio";
import estilos from "../biblioteca.module.css";
import Medidor from "../Medidor";
import { CATEGORIAS, MUSCULOS, intensidadesDeEjercicio, nombreTipo } from "@/lib/ejercicios";
import { TRABAJOS, type Trabajo } from "@/lib/trabajoEjercicio";
import { createClient } from "@/lib/supabase/client";

type Ejercicio = {
  id: string;
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  tipo: string;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
  foto_url: string | null;
  dificultad: string | null;
  trabajo: Trabajo | null;
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
};

type Pestana = "descripcion" | "musculos" | "trabajo" | "material";

export default function FichaEjercicio() {
  const { id } = useParams<{ id: string }>();
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [e, setE] = useState<Ejercicio | null | undefined>(undefined);
  const [pestana, setPestana] = useState<Pestana>("descripcion");
  const [tocado, setTocado] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("ejercicios")
      .select("id, nombre, nombre_en, categoria, tipo, descripcion, descripcion_en, video_url, foto_url, dificultad, trabajo, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setE((data as unknown as Ejercicio | null) ?? null));
  }, [id]);

  const volver = <BarraSuperior izquierda={{ href: "/biblioteca", texto: "volver" }} />;
  if (e === undefined)
    return (
      <main className={styles.pagina}>
        {volver}
        <Cargando />
      </main>
    );
  if (e === null)
    return (
      <main className={styles.pagina}>
        {volver}
        <p className={styles.aviso}>{en ? "Exercise not found." : "No se ha encontrado ese ejercicio."}</p>
      </main>
    );

  const nombre = (en && e.nombre_en) || e.nombre;
  const texto = (en && e.descripcion_en) || e.descripcion || "";
  const pasos = texto.split(/\n+/).map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  const materiales = e.ejercicio_materiales.map((m) => (en && m.materiales?.nombre_en) || m.materiales?.nombre).filter((x): x is string => !!x);
  const categoria = CATEGORIAS.find((c) => c.valor === e.categoria)?.[idioma];
  const tipo = nombreTipo(e.tipo);
  const trabajo = TRABAJOS.filter((t) => (e.trabajo?.[t.clave] ?? 0) > 0);
  const suma = Math.max(100, trabajo.reduce((n, t) => n + (e.trabajo?.[t.clave] ?? 0), 0));

  const nombreMusculo = (valor: string) => MUSCULOS.find((m) => m.valor === valor)?.[idioma] ?? valor;
  const pestanas: { id: Pestana; texto: string }[] = [
    { id: "descripcion", texto: en ? "Description" : "Descripción" },
    { id: "musculos", texto: en ? "Muscles" : "Músculos" },
    { id: "trabajo", texto: en ? "Work" : "Trabajo" },
    { id: "material", texto: en ? "Equipment" : "Material" },
  ];

  return (
    <main className={styles.pagina}>
      {volver}
      {e.video_url ? (
        <VideoEjercicio url={e.video_url} titulo={nombre} />
      ) : e.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.foto_url} alt={nombre} style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 16, background: "var(--relleno)" }} />
      ) : null}

      <div className={estilos.cabeza}>
        <h1>{nombre}</h1>
        <Medidor dificultad={e.dificultad} idioma={idioma} />
        <div className={estilos.etiquetas}>
          {categoria && <span className={estilos.etiqueta}>{categoria}</span>}
          <span className={estilos.etiqueta}>{tipo}</span>
          {materiales.map((m) => (
            <span key={m} className={estilos.etiqueta}>
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className={estilos.pestanas} role="tablist">
        {pestanas.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} className={pestana === p.id ? estilos.activa : ""} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      <section className={estilos.panel}>
        {pestana === "descripcion" &&
          (pasos.length === 0 ? (
            <p className={styles.ayuda}>{en ? "No description yet." : "Todavía no hay descripción."}</p>
          ) : (
            <ol className={estilos.pasos}>
              {pasos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          ))}

        {pestana === "musculos" && (
          <>
            <MapaCorporal
              intensidades={intensidadesDeEjercicio(e.ejercicio_musculos)}
              etiquetas={{ frente: en ? "Front" : "Frente", espalda: en ? "Back" : "Espalda" }}
              alPulsar={(m) => setTocado(nombreMusculo(m))}
            />
            <p className={estilos.musculo} aria-live="polite">
              {tocado ?? (en ? "Tap a muscle to see its name" : "Pulsa un músculo para ver su nombre")}
            </p>
            <p className={styles.ayuda} style={{ margin: 0 }}>
              <strong>{en ? "Main:" : "Principales:"}</strong> {e.ejercicio_musculos.filter((m) => m.rol === "principal").map((m) => nombreMusculo(m.musculo)).join(", ") || "—"}
              <br />
              <strong>{en ? "Secondary:" : "Secundarios:"}</strong> {e.ejercicio_musculos.filter((m) => m.rol === "secundario").map((m) => nombreMusculo(m.musculo)).join(", ") || "—"}
            </p>
          </>
        )}

        {pestana === "trabajo" &&
          (trabajo.length === 0 ? (
            <p className={styles.ayuda}>{en ? "No data yet." : "Todavía no hay datos."}</p>
          ) : (
            trabajo.map((t) => {
              const valor = e.trabajo?.[t.clave] ?? 0;
              return (
                <div key={t.clave} className={estilos.fila}>
                  <span>{t[idioma]}</span>
                  <span className={estilos.pista}>
                    <span className={estilos.relleno} style={{ display: "block", width: `${Math.round((valor / suma) * 100)}%`, background: t.color }} />
                  </span>
                  <strong>{Math.round((valor / suma) * 100)} %</strong>
                </div>
              );
            })
          ))}

        {pestana === "material" &&
          (materiales.length === 0 ? (
            <p className={styles.ayuda}>{en ? "No equipment needed." : "No hace falta material."}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              {materiales.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ))}
      </section>
    </main>
  );
}
