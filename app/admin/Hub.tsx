import Link from "next/link";
import { fondoFoto, type FotoNombre } from "@/lib/fotos";
import styles from "./admin.module.css";

export type Azulejo = { href?: string; titulo: string; foto: FotoNombre; proximamente?: boolean };

// Cuadrícula de opciones con foto. Las que aún no llevan a ningún sitio salen apagadas con «Próximamente».
export function Cuadricula({ azulejos }: { azulejos: Azulejo[] }) {
  return (
    <div className={styles.cuadricula}>
      {azulejos.map((a) =>
        a.href && !a.proximamente ? (
          <Link key={a.titulo} href={a.href} className={styles.azulejo} style={{ backgroundImage: fondoFoto(a.foto) }}>
            <span>{a.titulo}</span>
          </Link>
        ) : (
          <div key={a.titulo} className={`${styles.azulejo} ${styles.azulejoApagado}`} style={{ backgroundImage: fondoFoto(a.foto) }} aria-disabled="true">
            <span>
              {a.titulo}
              <small>Próximamente</small>
            </span>
          </div>
        ),
      )}
    </div>
  );
}

// Pantalla que agrupa las opciones de una sección (por ejemplo, Clases presenciales).
export default function Hub({ titulo, azulejos }: { titulo: string; azulejos: Azulejo[] }) {
  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>{titulo}</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>
      <Cuadricula azulejos={azulejos} />
    </main>
  );
}
