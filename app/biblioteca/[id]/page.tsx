"use client";

import { encuadreDeFoto, sinEncuadre } from "@/lib/fotos";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import MapaCorporal from "../../MapaCorporal";
import { useIdioma } from "../../useIdioma";
import VideoEjercicio from "../../VideoEjercicio";
import estilos from "../biblioteca.module.css";
import { CATEGORIAS, MUSCULOS, intensidadesDeEjercicio, nombreTipo } from "@/lib/ejercicios";
import { DIFICULTADES, TRABAJOS, type Trabajo } from "@/lib/trabajoEjercicio";
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

type Pestana = "pasos" | "musculos" | "trabajo" | "material";

export default function FichaEjercicio() {
  const { id } = useParams<{ id: string }>();
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [e, setE] = useState<Ejercicio | null | undefined>(undefined);
  const [pestana, setPestana] = useState<Pestana>("pasos");
  const [tocado, setTocado] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ejercicios")
      .select("id, nombre, nombre_en, categoria, tipo, descripcion, descripcion_en, video_url, foto_url, dificultad, trabajo, ejercicio_musculos(musculo, rol), ejercicio_materiales(materiales(nombre, nombre_en))")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setE((data as unknown as Ejercicio | null) ?? null));
  }, [id]);

  if (e === undefined)
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/biblioteca", texto: "volver" }} />
        <Cargando />
      </main>
    );
  if (e === null)
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/biblioteca", texto: "volver" }} />
        <p className={styles.aviso}>{en ? "Exercise not found." : "No se ha encontrado ese ejercicio."}</p>
      </main>
    );

  const nombre = (en && e.nombre_en) || e.nombre;
  const texto = (en && e.descripcion_en) || e.descripcion || "";
  const pasos = texto.split(/\n+/).map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  const materiales = e.ejercicio_materiales.map((m) => (en && m.materiales?.nombre_en) || m.materiales?.nombre).filter((x): x is string => !!x);
  const categoria = CATEGORIAS.find((c) => c.valor === e.categoria)?.[idioma];
  const dificultad = DIFICULTADES.find((d) => d.valor === e.dificultad);
  const trabajo = TRABAJOS.filter((t) => (e.trabajo?.[t.clave] ?? 0) > 0);
  const suma = Math.max(100, trabajo.reduce((n, t) => n + (e.trabajo?.[t.clave] ?? 0), 0));

  const nombreMusculo = (valor: string) => MUSCULOS.find((m) => m.valor === valor)?.[idioma] ?? valor;
  const pestanas: { id: Pestana; texto: string }[] = [
    { id: "pasos", texto: en ? "Steps" : "Pasos" },
    { id: "musculos", texto: en ? "Muscles" : "Músculos" },
    { id: "trabajo", texto: en ? "Work" : "Trabajo" },
    { id: "material", texto: en ? "Equipment" : "Material" },
  ];

  return (
    <main className={styles.pagina} style={{ paddingTop: 0 }}>
      <div className={estilos.hero}>
        {e.video_url ? (
          <VideoEjercicio url={e.video_url} titulo={nombre} proporcion="1 / 1" redondeo={0} />
        ) : e.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sinEncuadre(e.foto_url)} alt={nombre} className={estilos.heroFoto} style={{ objectPosition: `${encuadreDeFoto(e.foto_url).x}% ${encuadreDeFoto(e.foto_url).y}%` }} />
        ) : (
          <div className={estilos.heroVacio} />
        )}
        <Link href="/biblioteca" className={estilos.atras} aria-label={en ? "Back" : "Volver"}>
          ‹
        </Link>
      </div>

      <div className={estilos.cuerpo}>
        {dificultad && (
          <p className={estilos.dificultad}>
            {dificultad[idioma]}{" "}
            <span aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} style={{ opacity: n <= dificultad.nivel ? 1 : 0.3 }}>
                  ✦
                </span>
              ))}
            </span>
          </p>
        )}
        <h1 className={estilos.titulo}>{nombre}</h1>
        <p className={estilos.subtitulo}>
          {[categoria, nombreTipo(e.tipo), materiales.join(", ")].filter(Boolean).join(" · ")}
        </p>

        <div className={estilos.pestanasLinea} role="tablist">
          {pestanas.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} className={pestana === p.id ? estilos.activaLinea : ""} onClick={() => setPestana(p.id)}>
              {p.texto}
            </button>
          ))}
        </div>

        <section className={estilos.contenido}>
          {pestana === "pasos" &&
            (pasos.length === 0 ? (
              <p className={styles.ayuda}>{en ? "No steps yet." : "Todavía no hay pasos."}</p>
            ) : (
              <ul className={estilos.guiones}>
                {pasos.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
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
              <p style={{ margin: 0, lineHeight: 1.6 }}>
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
              <ul className={estilos.guiones}>
                {materiales.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ))}
        </section>
      </div>
    </main>
  );
}
