"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import entrenamiento from "../rutina/entrenamiento.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import { useComo } from "../rutina/useComo";
import { createClient } from "@/lib/supabase/client";
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
  // «?como=»: Miriam mira el progreso de otra persona (solo lectura).
  const como = useComo();
  const [servicioComo, setServicioComo] = useState<{ id: string; online: boolean; presencial: boolean } | null>(null);
  useEffect(() => {
    if (!como) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("perfil_servicios").select("servicio").eq("user_id", como),
      supabase.from("bonos").select("servicio").eq("user_id", como).in("estado", ["activo", "en_cola", "agotado"]),
    ]).then(([{ data: ps }, { data: bs }]) => {
      const s = new Set([...(ps ?? []), ...(bs ?? [])].map((x) => x.servicio as string));
      setServicioComo({ id: como, online: s.has("online"), presencial: s.has("grupal") || s.has("individual") || s.has("taller") });
    });
  }, [como]);
  const deOtra = como && servicioComo?.id === como ? servicioComo : null;
  const cargado = como ? deOtra !== null : typeof perfil === "object" && perfil !== null;
  const online = deOtra ? deOtra.online : typeof perfil === "object" && perfil !== null && (perfil.servicios.includes("online") || perfil.planOnline);
  const presencial = deOtra ? deOtra.presencial : typeof perfil === "object" && perfil !== null && (perfil.servicios.includes("grupal") || perfil.servicios.includes("individual") || perfil.servicios.includes("taller"));

  // Sin online no hay gráficas de ejercicios: todo lo suyo está en la primera pantalla.
  const sinGraficas = cargado && !online && vista === "estadisticas";
  useEffect(() => {
    if (sinGraficas) router.replace(como ? `/progreso?como=${como}` : "/progreso");
  }, [sinGraficas, router, como]);

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto titulo={t.progresoTitulo} />

      {online && (
        <>
          <div className={entrenamiento.subpestanas}>
            <Link href={como ? `/progreso?como=${como}` : "/progreso"} className={vista === "evolucion" ? entrenamiento.activa : ""}>
              {t.subEvolucion}
            </Link>
            <Link href={como ? `/progreso/estadisticas?como=${como}` : "/progreso/estadisticas"} className={vista === "estadisticas" ? entrenamiento.activa : ""}>
              {t.subEstadisticas}
            </Link>
          </div>
        </>
      )}

      {!cargado || sinGraficas ? (
        <Cargando />
      ) : (
        <Progreso userId={como ?? undefined} admin={!!como} online={online} presencial={presencial} vista={vista} />
      )}
    </main>
  );
}
