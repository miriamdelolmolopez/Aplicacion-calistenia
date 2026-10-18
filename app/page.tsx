"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { obtenerFotosApp } from "./fotos/acciones";
import styles from "./page.module.css";
import { IDIOMAS, textos, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";
import { fondoFoto } from "@/lib/fotos";

export default function Inicio() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const [propia, setPropia] = useState<string | null>(null);

  useEffect(() => {
    obtenerFotosApp().then((f) => setPropia(f.portada));
  }, []);

  return (
    <main className={styles.portada} style={{ backgroundImage: fondoFoto("portada", propia) }}>
      <header className={styles.arriba}>
        <Link href="/entrar" className={styles.entrar}>
          {t.entrar}
        </Link>
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
        <Image src="/logos/logo_cream.png" alt="" width={240} height={213} priority className={styles.logo} />
        <h1>Miriam del Olmo</h1>
        <p className={styles.lema}>{t.lema}</p>
      </section>

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
    </main>
  );
}
