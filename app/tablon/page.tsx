"use client";

import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import TablonAnuncios from "../ui/TablonAnuncios";
import { useIdioma } from "../useIdioma";

export default function Tablon() {
  const [idioma] = useIdioma();
  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{idioma === "en" ? "Notice board" : "Tablón de anuncios"}</h1>
      <TablonAnuncios />
    </main>
  );
}
