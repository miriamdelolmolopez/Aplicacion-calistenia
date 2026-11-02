"use client";

import Link from "next/link";
import LogoMarca from "./LogoMarca";
import styles from "./page.module.css";
import { IDIOMAS, textos, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";
import { useRegistroAbierto } from "./useRegistroAbierto";

export default function Portada() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const registroAbierto = useRegistroAbierto();
  return (
    <main className={styles.portada}>
      <div className={styles.fondo} aria-hidden="true" />
      <header className={styles.arriba}>
        <span />
        <label className={styles.idioma}>
          <span className={styles.oculto}>{t.idioma}</span>
          <select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)}>
            {IDIOMAS.map((i) => (
              <option key={i.codigo} value={i.codigo}>
                {i.nombre}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className={styles.centro}>
        <LogoMarca prioridad className={styles.logo} />
        <h1 className={styles.oculto}>CalisCoach</h1>
        <p className={styles.lema}>{t.lema}</p>
      </section>

      <nav className={styles.botones}>
        <Link href="/entrar" className={styles.boton}>
          {t.soyAlumno}
        </Link>
        {registroAbierto && (
          <Link href="/registro" className={`${styles.boton} ${styles.botonSecundario}`}>
            {t.crearCuentaPrueba}
          </Link>
        )}
      </nav>
    </main>
  );
}
