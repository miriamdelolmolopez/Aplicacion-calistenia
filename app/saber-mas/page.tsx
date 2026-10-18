"use client";

import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";

// De momento solo avisa de que está en camino; aquí irá el glosario.
export default function SaberMas() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto foto="pino" titulo={`${t.botonSaberMas} ${t.botonGlosario}`} />
      <section className={styles.tarjeta}>
        <h2 style={{ margin: 0 }}>{t.proximamenteTitulo}</h2>
        <p style={{ margin: 0 }}>{t.proximamenteTexto}</p>
      </section>
    </main>
  );
}
