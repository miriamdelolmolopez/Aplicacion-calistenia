"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import { IDIOMAS, textos, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";

export default function Portada() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
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
        <Image src="/logos/caliscoach.png" alt="" width={256} height={256} priority className={styles.logo} />
        <h1>CalisCoach</h1>
        <p className={styles.lema}>{t.lema}</p>
      </section>

      <nav className={styles.botones}>
        <Link href="/entrar" className={styles.boton}>
          {t.soyAlumno}
        </Link>
        <Link href="/registro" className={`${styles.boton} ${styles.botonSecundario}`}>
          {t.crearCuentaPrueba}
        </Link>
      </nav>
    </main>
  );
}
