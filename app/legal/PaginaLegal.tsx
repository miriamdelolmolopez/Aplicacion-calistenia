import Link from "next/link";
import type { Bloque, SeccionLegal } from "@/lib/legalTexto";
import estilos from "./legal.module.css";

const ENLACES = [
  { href: "/legal/terminos", texto: "Términos y condiciones" },
  { href: "/legal/privacidad", texto: "Política de privacidad" },
  { href: "/legal/aviso-legal", texto: "Aviso legal" },
  { href: "/legal/cookies", texto: "Cookies" },
];

export function Bloques({ bloques }: { bloques: Bloque[] }) {
  return (
    <>
      {bloques.map((b, i) => (
        <div key={i}>
          {b.p && <p>{b.p}</p>}
          {b.lista && (
            <ul>
              {b.lista.map((l, n) => (
                <li key={n}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}

export default function PaginaLegal({
  titulo,
  version,
  fecha,
  intro = [],
  secciones,
}: {
  titulo: string;
  version?: string;
  fecha?: string;
  intro?: Bloque[];
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
        {version && (
          <p className={estilos.version}>
            Versión {version}
            {fecha ? ` · Última actualización: ${fecha}` : ""}. Texto legal en español.
          </p>
        )}
        <Bloques bloques={intro} />
        {secciones.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            <Bloques bloques={s.bloques} />
          </section>
        ))}
      </article>
    </main>
  );
}
