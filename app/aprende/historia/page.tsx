"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { useIdioma } from "../../useIdioma";
import estilos from "../aprende.module.css";
import { textosAprende } from "../textosAprende";
import { createClient } from "@/lib/supabase/client";

type Seccion = { id: string; titulo_es: string; titulo_en: string | null; texto_es: string; texto_en: string | null; foto_url: string | null };

export default function Historia() {
  const [idioma] = useIdioma();
  const t = textosAprende[idioma];
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);

  useEffect(() => {
    createClient()
      .from("historia")
      .select("id, titulo_es, titulo_en, texto_es, texto_en, foto_url")
      .eq("activo", true)
      .order("orden")
      .then(({ data }) => setSecciones((data ?? []) as Seccion[]));
  }, []);

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/aprende", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 14px", fontSize: "2rem" }}>{t.historia}</h1>

      {secciones === null && <p className={styles.aviso}>{t.cargando}</p>}
      {secciones !== null && secciones.length === 0 && <p className={styles.aviso}>{t.sinContenido}</p>}

      <div className={estilos.lista}>
        {(secciones ?? []).map((s) => (
          <section key={s.id} className={estilos.seccion}>
            {s.foto_url && <div className={estilos.foto} role="img" aria-label={(idioma === "en" && s.titulo_en) || s.titulo_es} style={{ backgroundImage: `url(${s.foto_url})` }} />}
            <h2>{(idioma === "en" && s.titulo_en) || s.titulo_es}</h2>
            {((idioma === "en" && s.texto_en) || s.texto_es)
              .split(/\n+/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </section>
        ))}
      </div>
    </main>
  );
}
