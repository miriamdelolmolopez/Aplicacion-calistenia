import Link from "next/link";
import { FECHA_LEGAL, VERSION_LEGAL } from "@/lib/legal";
import estilos from "./legal.module.css";

export type Bloque = { p?: string; lista?: string[] };
export type SeccionLegal = { titulo: string; bloques: Bloque[] };

const ENLACES = [
  { href: "/legal/terminos", texto: "Términos y condiciones" },
  { href: "/legal/privacidad", texto: "Política de privacidad" },
  { href: "/legal/aviso-legal", texto: "Aviso legal" },
  { href: "/legal/cookies", texto: "Cookies" },
];

export default function PaginaLegal({
  titulo,
  intro,
  secciones,
}: {
  titulo: string;
  intro?: string;
  secciones: SeccionLegal[];
}) {
  return (
    <main className={estilos.pagina}>
      <nav className={estilos.enlaces} aria-label="Textos legales">
        {ENLACES.map((e) => (
          <Link key={e.href} href={e.href}>
            {e.texto}
          </Link>
        ))}
      </nav>
      <article className={estilos.tarjeta}>
        <h1>{titulo}</h1>
        <p className={estilos.version}>
          Versión {VERSION_LEGAL} · Última actualización: {FECHA_LEGAL}. Texto legal en español.
        </p>
        {intro && <p>{intro}</p>}
        {secciones.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            {s.bloques.map((b, i) => (
              <div key={i}>
                {b.p && <p>{b.p}</p>}
                {b.lista && (
                  <ul>
                    {b.lista.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
