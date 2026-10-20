"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import Icono from "../../Icono";
import { useIdioma } from "../../useIdioma";
import estilos from "../aprende.module.css";
import { textosAprende } from "../textosAprende";
import { createClient } from "@/lib/supabase/client";

type Termino = { id: string; termino_es: string; termino_en: string | null; definicion_es: string; definicion_en: string | null; foto_url: string | null };

// Sin tildes ni mayúsculas, para que «excentrico» también encuentre «Excéntrico».
const limpiar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Glosario() {
  const [idioma] = useIdioma();
  const t = textosAprende[idioma];
  const [terminos, setTerminos] = useState<Termino[] | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    createClient()
      .from("glosario")
      .select("id, termino_es, termino_en, definicion_es, definicion_en, foto_url")
      .eq("activo", true)
      .then(({ data }) => setTerminos((data ?? []) as Termino[]));
  }, []);

  const nombre = (x: Termino) => (idioma === "en" && x.termino_en) || x.termino_es;
  const definicion = (x: Termino) => (idioma === "en" && x.definicion_en) || x.definicion_es;

  const clave = limpiar(busqueda.trim());
  const visibles = (terminos ?? [])
    .filter((x) => !clave || limpiar(`${x.termino_es} ${x.termino_en ?? ""} ${x.definicion_es} ${x.definicion_en ?? ""}`).includes(clave))
    .sort((a, b) => nombre(a).localeCompare(nombre(b), idioma));

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

      {terminos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {terminos !== null && terminos.length === 0 && <p className={styles.aviso}>{t.sinContenido}</p>}
      {terminos !== null && terminos.length > 0 && visibles.length === 0 && <p className={styles.aviso}>{t.sinResultados}</p>}

      <div className={estilos.lista}>
        {visibles.map((x) => (
          <article key={x.id} className={estilos.termino}>
            {x.foto_url && <div className={estilos.foto} role="img" aria-label={nombre(x)} style={{ backgroundImage: `url(${x.foto_url})` }} />}
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
