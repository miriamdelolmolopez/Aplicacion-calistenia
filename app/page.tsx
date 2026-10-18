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

        <nav className={styles.botones}>
          <Link href="/entrar" className={styles.boton}>
            {t.soyAlumno}
          </Link>
          <Link href="/registro" className={`${styles.boton} ${styles.botonSecundario}`}>
            <span>
              {t.crearCuentaPrueba}
              <small>{t.soloGrupalesFuengirola}</small>
            </span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
