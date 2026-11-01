"use client";

import Image from "next/image";
import Link from "next/link";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { useIdioma } from "../useIdioma";
import estilos from "./prueba.module.css";

const TEXTOS = {
  es: {
    titulo: "Prueba una clase gratis",
    intro: "Calistenia y pino en Fuengirola. Crea tu cuenta y reserva tu clase de prueba gratuita. Es una sola por persona.",
    pasos: ["Crea tu cuenta con tu correo o con Google.", "Completa tus datos y acepta los textos legales.", "Elige una de las clases con plaza de prueba y reserva."],
    crear: "Crear mi cuenta",
    yaTengo: "Ya tengo cuenta",
    noDisponible: "Este enlace no está disponible",
    noDisponibleTexto: "Puede que haya caducado o que ya no esté activo. Escríbele a Miriam y te dice cómo probar una clase.",
    whatsapp: "Escribir por WhatsApp",
  },
  en: {
    titulo: "Try a class for free",
    intro: "Calisthenics and handstands in Fuengirola. Create your account and book your free trial class. One per person.",
    pasos: ["Create your account with your email or Google.", "Fill in your details and accept the legal texts.", "Pick one of the classes with a trial spot and book it."],
    crear: "Create my account",
    yaTengo: "I already have an account",
    noDisponible: "This link is not available",
    noDisponibleTexto: "It may have expired or been switched off. Message Miriam and she will tell you how to try a class.",
    whatsapp: "Message on WhatsApp",
  },
};

export default function Prueba({ disponible, codigo }: { disponible: boolean; codigo: string }) {
  const [idioma] = useIdioma();
  const t = TEXTOS[idioma];

  return (
    <main className={styles.pagina}>
      <div className={styles.fondoEntrar} aria-hidden="true" />
      <BarraSuperior izquierda={{ href: "/", texto: "volver" }} />
      <div className={styles.cabecera}>
        <Image src="/logos/caliscoach.png" alt="CalisCoach" width={88} height={88} priority className={estilos.logo} />
        <h1>{disponible ? t.titulo : t.noDisponible}</h1>
        <p>{disponible ? t.intro : t.noDisponibleTexto}</p>
      </div>

      {disponible ? (
        <section className={styles.tarjeta}>
          <ol className={estilos.pasos}>
            {t.pasos.map((p, i) => (
              <li key={p}>
                <span>{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
          <Link href={`/registro?origen=prueba&c=${encodeURIComponent(codigo)}`} className={styles.boton}>
            {t.crear}
          </Link>
          <div className={styles.enlaces}>
            <Link href="/entrar">{t.yaTengo}</Link>
          </div>
        </section>
      ) : (
        <section className={styles.tarjeta}>
          <a href="https://wa.me/34644184762" target="_blank" rel="noopener noreferrer" className={styles.boton}>
            {t.whatsapp}
          </a>
        </section>
      )}
    </main>
  );
}
