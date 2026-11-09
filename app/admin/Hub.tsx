"use client";

import Link from "next/link";
import CamaraCard from "../CamaraCard";
import { useFotoCard } from "../useFotosCards";
import { estiloFoto, type FotoNombre } from "@/lib/fotos";
import styles from "./admin.module.css";
import CabeceraAdmin from "./CabeceraAdmin";
import { useNombresAdmin } from "./NombresAdmin";

export type Azulejo = { href?: string; titulo: string; foto: FotoNombre; proximamente?: boolean };

function Tarjeta({ a }: { a: Azulejo }) {
  const clave = `azulejo:${a.titulo}`;
  const nombres = useNombresAdmin();
  const titulo = (a.href && nombres[a.href]) || a.titulo; // el nombre cambiado por la administradora (la foto sigue ligada al original)
  const fondo = estiloFoto(a.foto, useFotoCard(clave));
  return a.href && !a.proximamente ? (
    <Link href={a.href} className={styles.azulejo} style={fondo}>
      <span>{titulo}</span>
      <CamaraCard clave={clave} />
    </Link>
  ) : (
    <div className={`${styles.azulejo} ${styles.azulejoApagado}`} style={fondo} aria-disabled="true">
      <span>
        {titulo}
        <small>Próximamente</small>
      </span>
      <CamaraCard clave={clave} />
    </div>
  );
}

// Cuadrícula de opciones con foto. Las que aún no llevan a ningún sitio salen apagadas con «Próximamente».
export function Cuadricula({ azulejos }: { azulejos: Azulejo[] }) {
  return (
    <div className={styles.cuadricula}>
      {azulejos.map((a) => (
        <Tarjeta key={a.titulo} a={a} />
      ))}
    </div>
  );
}

// Pantalla que agrupa las opciones de una sección (por ejemplo, Clases presenciales).
export default function Hub({ titulo, azulejos }: { titulo: string; azulejos: Azulejo[] }) {
  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>{titulo}</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <Cuadricula azulejos={azulejos} />
    </main>
  );
}
