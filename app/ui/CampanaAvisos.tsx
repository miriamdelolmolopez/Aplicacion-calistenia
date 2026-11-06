"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { contarNoLeidas } from "../notificaciones/acciones";
import estilos from "./campana.module.css";

// Campana de avisos: lleva a la lista de notificaciones y enseña cuántas hay sin leer.
export default function CampanaAvisos() {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let vigente = true;
    const leer = () =>
      contarNoLeidas()
        .then((n) => vigente && setPendientes(n))
        .catch(() => {});
    leer();
    const cada = setInterval(leer, 60_000);
    return () => {
      vigente = false;
      clearInterval(cada);
    };
  }, []);

  return (
    <Link href="/notificaciones" className={estilos.campana} aria-label={pendientes > 0 ? `Avisos: ${pendientes} sin leer` : "Avisos"}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {pendientes > 0 && <span className={estilos.numero}>{pendientes > 9 ? "9+" : pendientes}</span>}
    </Link>
  );
}
