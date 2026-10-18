"use client";

import Link from "next/link";
import styles from "./formularios.module.css";
import MenuLateral from "./MenuLateral";
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

  const enlace = izquierda ? (
    <Link href={izquierda.href} className={styles.enlaceBarra}>
      {izquierda.texto === "volver" ? "← " + t.volver : t.entrar}
    </Link>
  ) : (
    <span />
  );

  return (
    <header className={styles.barra}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MenuLateral />
        {enlace}
      </div>
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
