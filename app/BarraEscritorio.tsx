"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CampanaAvisos from "./ui/CampanaAvisos";
import { PESTANAS_AJUSTES, esDePestana, itemDeRuta } from "./gruposAdmin";
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

  const esAdmin = perfil.rol === "admin";
  const item = esAdmin ? itemDeRuta(ruta) : null;
  const deAjustes = esAdmin ? PESTANAS_AJUSTES.find((p) => esDePestana(ruta, p)) : null;
  const grupo = deAjustes ? { texto: "Ajustes", href: "/ajustes" } : item?.pestanas ? { texto: item.texto, href: null as string | null } : null;
  const pestana = deAjustes ?? item?.pestanas?.find((p) => esDePestana(ruta, p));
  const actual = pestana?.texto ?? item?.texto ?? (titulo && titulo !== "CalisCoach" ? titulo : ruta === "/inicio" ? "Inicio" : "");

  return (
    <header className={estilos.barra}>
      <div className={estilos.donde}>
        {grupo && (
          <>
            {grupo.href ? (
              <Link href={grupo.href} className={estilos.grupo}>
                {grupo.texto}
              </Link>
            ) : (
              <span className={estilos.grupo}>{grupo.texto}</span>
            )}
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
