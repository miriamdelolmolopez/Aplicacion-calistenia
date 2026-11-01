"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import Icono from "../../Icono";
import { useIdioma } from "../../useIdioma";
import estilos from "../aprende.module.css";
import { textosAprende } from "../textosAprende";
import { CATEGORIAS_GLOSARIO, nombreCategoria } from "@/lib/categoriasGlosario";
import { createClient } from "@/lib/supabase/client";
import Cargando from "../../Cargando";

type Termino = { id: string; termino_es: string; termino_en: string | null; definicion_es: string; definicion_en: string | null; foto_url: string | null; categoria: string | null };

// Sin tildes ni mayúsculas, para que «excentrico» también encuentre «Excéntrico».
const limpiar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Glosario() {
  const [idioma] = useIdioma();
  const t = textosAprende[idioma];
  const [terminos, setTerminos] = useState<Termino[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [orden, setOrden] = useState<"az" | "za" | "categoria">("az");

  useEffect(() => {
    createClient()
      .from("glosario")
      .select("id, termino_es, termino_en, definicion_es, definicion_en, foto_url, categoria")
      .eq("activo", true)
      .then(({ data }) => setTerminos((data ?? []) as Termino[]));
  }, []);

  const nombre = (x: Termino) => (idioma === "en" && x.termino_en) || x.termino_es;
  const definicion = (x: Termino) => (idioma === "en" && x.definicion_en) || x.definicion_es;

  const clave = limpiar(busqueda.trim());
  const visibles = (terminos ?? [])
    .filter((x) => categoria === "todas" || x.categoria === categoria)
    .filter((x) => !clave || limpiar(`${x.termino_es} ${x.termino_en ?? ""} ${x.definicion_es} ${x.definicion_en ?? ""}`).includes(clave))
    .sort((a, b) => {
      if (orden === "categoria") {
        const i = CATEGORIAS_GLOSARIO.findIndex((c) => c.clave === a.categoria) - CATEGORIAS_GLOSARIO.findIndex((c) => c.clave === b.categoria);
        if (i !== 0) return i;
      }
      const r = nombre(a).localeCompare(nombre(b), idioma);
      return orden === "za" ? -r : r;
    });

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/aprende", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 14px", fontSize: "2rem" }}>{t.glosario}</h1>

      <div className={estilos.buscador}>
        <Icono nombre="lupa" tamano={22} />
        <input
          type="search"
          value={busqueda}
          placeholder={t.buscar}
          aria-label={t.buscar}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className={estilos.filtros}>
        <div className={estilos.chips}>
          <button type="button" className={`${estilos.chip} ${categoria === "todas" ? estilos.chipActivo : ""}`} onClick={() => setCategoria("todas")}>
            {idioma === "en" ? "All" : "Todas"}
          </button>
          {CATEGORIAS_GLOSARIO.map((c) => (
            <button key={c.clave} type="button" className={`${estilos.chip} ${categoria === c.clave ? estilos.chipActivo : ""}`} onClick={() => setCategoria(c.clave)}>
              {c[idioma]}
            </button>
          ))}
        </div>
        <label className={estilos.orden}>
          {idioma === "en" ? "Sort" : "Ordenar"}
          <select value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)}>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="categoria">{idioma === "en" ? "By category" : "Por categoría"}</option>
          </select>
        </label>
      </div>

      {terminos === null && <Cargando />}
      {terminos !== null && terminos.length === 0 && <p className={styles.aviso}>{t.sinContenido}</p>}
      {terminos !== null && terminos.length > 0 && visibles.length === 0 && <p className={styles.aviso}>{t.sinResultados}</p>}

      <div className={estilos.lista}>
        {visibles.map((x) => (
          <article key={x.id} className={estilos.termino}>
            {x.foto_url && <div className={estilos.foto} role="img" aria-label={nombre(x)} style={{ backgroundImage: `url(${x.foto_url})` }} />}
            {nombreCategoria(x.categoria, idioma) && <small>{nombreCategoria(x.categoria, idioma)}</small>}
            <h2>{nombre(x)}</h2>
            {idioma === "es" && x.termino_en && x.termino_en !== x.termino_es && <small>{x.termino_en}</small>}
            {idioma === "en" && x.termino_en && x.termino_es !== x.termino_en && <small>{x.termino_es}</small>}
            <p>{definicion(x)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
