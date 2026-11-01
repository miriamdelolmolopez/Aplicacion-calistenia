"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import entrenamiento from "../rutina/entrenamiento.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import Progreso from "./Progreso";
import Cargando from "../Cargando";

// Pantalla de progreso.
//  · Con entrenamiento online: pantalla propia con dos pestañas: Evolución (planta, números y objetivos)
//    y Estadísticas (gráficas de ejercicios).
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
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto foto="progreso" titulo={t.progresoTitulo} />

      {online && (
        <>
          <div className={entrenamiento.subpestanas}>
            <Link href="/progreso" className={vista === "evolucion" ? entrenamiento.activa : ""}>
              {t.subEvolucion}
            </Link>
            <Link href="/progreso/estadisticas" className={vista === "estadisticas" ? entrenamiento.activa : ""}>
              {t.subEstadisticas}
            </Link>
          </div>
        </>
      )}

      {!cargado || sinGraficas ? (
        <Cargando />
      ) : (
        <Progreso online={online} presencial={presencial} vista={vista} />
      )}
    </main>
  );
}
