"use client";

import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import Progreso from "./Progreso";

export default function MiProgreso() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const perfil = useMiPerfil();
  const cargado = typeof perfil === "object" && perfil !== null;

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto foto="progreso" titulo={t.progresoTitulo} />
      {!cargado ? (
        <p className={styles.aviso}>{t.cargando}</p>
      ) : (
        // Cada persona ve la parte que le toca según sus servicios: clases, entreno online o las dos.
        <Progreso
          online={perfil.servicios.includes("online") || perfil.planOnline}
          presencial={perfil.servicios.includes("grupal") || perfil.servicios.includes("individual")}
        />
      )}
    </main>
  );
}
