"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CampanaAvisos from "./ui/CampanaAvisos";
import { GRUPOS_ADMIN, grupoDeRuta } from "./gruposAdmin";
import estilos from "./barraEscritorio.module.css";
import type { MiPerfil } from "./useMiPerfil";

// Barra de arriba, solo en pantallas grandes: dónde estás (grupo › pantalla) a la izquierda y Ayuda, avisos y tu foto a la derecha.
// El nombre de la pantalla sale del título de la pestaña del navegador (lo pone cada pantalla).
export default function BarraEscritorio({ perfil }: { perfil: MiPerfil }) {
  const ruta = usePathname();
  const [titulo, setTitulo] = useState("");

  useEffect(() => {
    const leer = () => setTitulo(document.title.split(" · ")[0].trim());
    leer();
    const nodo = document.querySelector("title");
    if (!nodo) return;
    const observador = new MutationObserver(leer);
    observador.observe(nodo, { childList: true, characterData: true, subtree: true });
    return () => observador.disconnect();
  }, [ruta]);

  const grupo = perfil.rol === "admin" ? grupoDeRuta(ruta) : null;
  const opcion = grupo ? [...GRUPOS_ADMIN.flatMap((g) => [...g.opciones, ...(g.menu ?? [])])].filter((o) => o.href && (ruta === o.href || ruta.startsWith(o.href + "/"))).sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0] : null;
  const actual = opcion?.texto ?? (titulo && titulo !== "CalisCoach" ? titulo : ruta === "/inicio" ? "Inicio" : "");

  return (
    <header className={estilos.barra}>
      <div className={estilos.donde}>
        {grupo && (
          <>
            <Link href="/admin" className={estilos.grupo}>
              {grupo.titulo}
            </Link>
            <span className={estilos.separador} aria-hidden="true">
              /
            </span>
          </>
        )}
        <strong>{actual}</strong>
      </div>
      <div className={estilos.derecha}>
        <Link href="/ayuda" className={estilos.ayuda}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Ayuda
        </Link>
        <CampanaAvisos />
      </div>
    </header>
  );
}
