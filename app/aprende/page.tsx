"use client";

import Link from "next/link";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import Icono, { type NombreIcono } from "../Icono";
import { useIdioma } from "../useIdioma";
import estilos from "./aprende.module.css";
import { textosAprende } from "./textosAprende";

// Aprende: glosario, historia y examen para ponerse a prueba.
export default function Aprende() {
  const [idioma] = useIdioma();
  const t = textosAprende[idioma];

  const opciones: { href: string; icono: NombreIcono; titulo: string; ayuda: string }[] = [
    { href: "/aprende/glosario", icono: "saber", titulo: t.glosario, ayuda: t.glosarioAyuda },
    { href: "/aprende/historia", icono: "historial", titulo: t.historia, ayuda: t.historiaAyuda },
    { href: "/aprende/examen", icono: "metricas", titulo: t.examen, ayuda: t.examenAyuda },
  ];

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto foto="pino" titulo={t.titulo} />
      <ul className={estilos.opciones}>
        {opciones.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className={estilos.opcion}>
              <span className={estilos.icono}>
                <Icono nombre={o.icono} tamano={24} />
              </span>
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
