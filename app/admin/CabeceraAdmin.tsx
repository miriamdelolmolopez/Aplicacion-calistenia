"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import CamaraCard from "../CamaraCard";
import { useFotoCard } from "../useFotosCards";
import { encuadreDeFoto, sinEncuadre } from "@/lib/fotos";
import styles from "./admin.module.css";

// Cabecera de cada pantalla de Administración. La administradora puede cambiar su foto y encuadrarla con la cámara;
// sin foto propia se ve la de siempre. Las pantallas de una persona concreta (con identificador en la dirección) no se personalizan.
export default function CabeceraAdmin({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const personalizable = !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ruta);
  const clave = `banner:${ruta}`;
  const propia = useFotoCard(clave);

  let estilo: CSSProperties = {};
  if (propia && personalizable) {
    const e = encuadreDeFoto(propia);
    estilo = {
      backgroundImage: `linear-gradient(to top, rgba(30, 30, 28, 0.62), rgba(30, 30, 28, 0.15) 70%), url("${sinEncuadre(propia)}"), linear-gradient(#967a6f, #967a6f)`,
      backgroundPosition: `center, ${e.x}% ${e.y}%, center`,
    };
  }

  return (
    <header className={styles.barra} style={{ position: "relative", ...estilo }}>
      {children}
      {personalizable && <CamaraCard clave={clave} izquierda />}
    </header>
  );
}
