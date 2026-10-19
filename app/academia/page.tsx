"use client";

import Link from "next/link";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { useIdioma } from "../useIdioma";
import estilos from "./academia.module.css";
import { textosAcademia } from "./textosAcademia";
import { fondoFoto } from "@/lib/fotos";

// Academia: cursos y formaciones. Dos opciones: cursos actuales o próximos cursos.
export default function Academia() {
  const [idioma] = useIdioma();
  const t = textosAcademia[idioma];

  const opciones = [
    { href: "/academia/actuales", titulo: t.actuales, ayuda: t.actualesAyuda },
    { href: "/academia/proximos", titulo: t.proximos, ayuda: t.proximosAyuda },
  ];

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <section className={estilos.banner} style={{ backgroundImage: fondoFoto("pino") }}>
        <h1>{t.bannerTitulo}</h1>
        <p>{t.bannerTexto}</p>
      </section>
      <ul className={estilos.opciones}>
        {opciones.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className={estilos.opcion}>
              <span>
                <strong>{o.titulo}</strong>
                <span className={estilos.ayuda}>{o.ayuda}</span>
              </span>
              <span className={estilos.flecha} aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
