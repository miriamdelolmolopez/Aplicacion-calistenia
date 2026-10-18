"use client";

import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import Progreso from "./Progreso";

export default function MiProgreso() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.progresoTitulo}</h1>
      </div>
      <Progreso />
    </main>
  );
}
