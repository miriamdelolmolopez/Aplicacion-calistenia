"use client";

import Link from "next/link";
import styles from "./formularios.module.css";
import { useIdioma } from "./useIdioma";

const TEXTOS = {
  es: {
    errorTitulo: "Algo no ha ido bien",
    errorTexto: "No te preocupes, tus datos están a salvo. Prueba otra vez; si sigue pasando, escríbenos.",
    reintentar: "Intentarlo de nuevo",
    noEncontradoTitulo: "No encontramos esta página",
    noEncontradoTexto: "Puede que el enlace esté mal escrito o que la página ya no exista.",
    ir: "Ir al inicio",
  },
  en: {
    errorTitulo: "Something went wrong",
    errorTexto: "Don't worry, your data is safe. Please try again; if it keeps happening, contact us.",
    reintentar: "Try again",
    noEncontradoTitulo: "We can't find this page",
    noEncontradoTexto: "The link may be mistyped or the page may no longer exist.",
    ir: "Go to home",
  },
};

// Pantalla amable para errores y páginas que no existen (en vez del mensaje técnico).
export default function PantallaError({ tipo, reintentar }: { tipo: "error" | "noEncontrado"; reintentar?: () => void }) {
  const [idioma] = useIdioma();
  const t = TEXTOS[idioma];
  return (
    <main className={styles.pagina}>
      <div className={styles.cabecera}>
        <h1>{tipo === "error" ? t.errorTitulo : t.noEncontradoTitulo}</h1>
        <p>{tipo === "error" ? t.errorTexto : t.noEncontradoTexto}</p>
      </div>
      <div className={styles.tarjeta}>
        {tipo === "error" && reintentar && (
          <button type="button" className={styles.boton} onClick={reintentar}>
            {t.reintentar}
          </button>
        )}
        <Link href="/inicio" className={styles.boton} style={{ textAlign: "center", textDecoration: "none" }}>
          {t.ir}
        </Link>
      </div>
    </main>
  );
}
