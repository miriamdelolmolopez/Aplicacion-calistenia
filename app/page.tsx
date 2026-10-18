"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { IDIOMAS, textos, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";

export default function Inicio() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <a href="#" className={styles.entrar}>
          {t.entrar}
        </a>
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

      <section className={styles.centro}>
        <Image
          src="/logos/logo_olive.png"
          alt=""
          width={240}
          height={213}
          priority
          className={styles.logo}
        />
        <h1>Miriam del Olmo</h1>
        <p className={styles.lema}>{t.lema}</p>

        <h2 className={styles.intro}>{t.intro}</h2>
        <nav className={styles.botones}>
          <a href="#" className={styles.boton}>
            {t.online}
          </a>
          <a href="#" className={styles.boton}>
            {t.presencial}
          </a>
          <a href="#" className={styles.boton}>
            {t.academia}
          </a>
        </nav>
      </section>
    </main>
  );
}
