"use client";

import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
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
      <CabeceraFoto foto="progreso" titulo={t.progresoTitulo} />
      <Progreso />
    </main>
  );
}
