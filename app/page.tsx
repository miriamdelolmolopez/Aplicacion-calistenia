"use client";

import Image from "next/image";
import Link from "next/link";
import BarraSuperior from "./BarraSuperior";
import styles from "./page.module.css";
import { textos } from "./textos";
import { useIdioma } from "./useIdioma";

export default function Inicio() {
  const [idioma] = useIdioma();
  const t = textos[idioma];

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/entrar", texto: "entrar" }} />

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

        <Link href="/registro" className={styles.enlaceSecundario}>
          {t.pruebaEnlace}
        </Link>
      </section>
    </main>
  );
}
