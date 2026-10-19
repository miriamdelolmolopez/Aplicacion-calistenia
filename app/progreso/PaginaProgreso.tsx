"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import entrenamiento from "../rutina/entrenamiento.module.css";
import PestanasEntreno from "../rutina/PestanasEntreno";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import Progreso from "./Progreso";

// Pantalla de progreso.
//  · Con entrenamiento online: cuelga de Entrenamiento (pestaña Progreso) y tiene dos
//    sub-pestañas: Evolución (planta, números y objetivos) y Estadísticas (gráficas de ejercicios).
//  · Solo con clases: una sola pantalla con su progreso.
export default function PaginaProgreso({ vista }: { vista: "evolucion" | "estadisticas" }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const perfil = useMiPerfil();
  const cargado = typeof perfil === "object" && perfil !== null;
  const online = cargado && (perfil.servicios.includes("online") || perfil.planOnline);
  const presencial = cargado && (perfil.servicios.includes("grupal") || perfil.servicios.includes("individual"));

  // Sin online no hay gráficas de ejercicios: todo lo suyo está en la primera pantalla.
  const sinGraficas = cargado && !online && vista === "estadisticas";
  useEffect(() => {
    if (sinGraficas) router.replace("/progreso");
  }, [sinGraficas, router]);

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: online ? "/rutina" : "/inicio", texto: "volver" }} />

      {online ? (
        <>
          <h1 className={entrenamiento.titulo}>{t.entrenamientoTitulo}</h1>
          <PestanasEntreno activa="progreso" rutinas={t.tabMisRutinas} progreso={t.tabProgreso} />
          <div className={entrenamiento.subpestanas}>
            <Link href="/progreso" className={vista === "evolucion" ? entrenamiento.activa : ""}>
              {t.subEvolucion}
            </Link>
            <Link href="/progreso/estadisticas" className={vista === "estadisticas" ? entrenamiento.activa : ""}>
              {t.subEstadisticas}
            </Link>
          </div>
        </>
      ) : (
        <CabeceraFoto foto="progreso" titulo={t.progresoTitulo} />
      )}

      {!cargado || sinGraficas ? (
        <p className={styles.aviso}>{t.cargando}</p>
      ) : (
        <Progreso online={online} presencial={presencial} vista={vista} />
      )}
    </main>
  );
}
