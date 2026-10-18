"use client";

import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import Progreso from "../../progreso/Progreso";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import estilos from "../entrenamiento.module.css";

// Historial de entrenos terminados (cada uno se despliega con sus series).
export default function Historial() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
      <h1 className={estilos.titulo}>{t.historialTitulo}</h1>
      <Progreso vista="historial" />
    </main>
  );
}
