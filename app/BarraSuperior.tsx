"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import styles from "./formularios.module.css";
import { IDIOMAS, textos, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";

// Barra de arriba: a la izquierda un enlace (volver o entrar) y a la derecha el idioma.
export default function BarraSuperior({
  izquierda,
}: {
  izquierda?: { href: string; texto: "volver" | "entrar" };
}) {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  // Si se llegó desde el Perfil (?desde=perfil), «volver» lleva de nuevo al Perfil.
  const desde = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("desde"),
    () => null,
  );

  const enlace = izquierda ? (
    <Link
      href={desde === "perfil" && izquierda.texto === "volver" ? "/perfil" : izquierda.href}
      className={styles.enlaceBarra}
    >
      {izquierda.texto === "volver" ? "← " + t.volver : t.entrar}
    </Link>
  ) : (
    <span />
  );

  return (
    <header className={styles.barra}>
      {enlace}
      <label className={styles.idioma}>
        <span className={styles.oculto}>{t.idioma}</span>
        <select
          value={idioma}
          onChange={(e) => cambiarIdioma(e.target.value as Idioma)}
        >
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nombre}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
