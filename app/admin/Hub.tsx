"use client";

import Link from "next/link";
import Icono, { type NombreIcono } from "../Icono";
import styles from "./admin.module.css";
import CabeceraAdmin from "./CabeceraAdmin";
import { useNombresAdmin } from "./NombresAdmin";

// «foto» ya no se usa (las tarjetas son limpias, sin fotos); se deja opcional para no tocar las pantallas que aún la pasan.
export type Azulejo = { href?: string; titulo: string; foto?: string; icono?: NombreIcono; descripcion?: string; proximamente?: boolean };

const Flecha = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

function Tarjeta({ a }: { a: Azulejo }) {
  const nombres = useNombresAdmin();
  const titulo = (a.href && nombres[a.href]) || a.titulo; // el nombre cambiado por la administradora
  const contenido = (
    <>
      <span className={styles.opcionIcono}>
        <Icono nombre={a.icono ?? "historial"} tamano={20} />
      </span>
      <span className={styles.opcionTexto}>
        <strong>{titulo}</strong>
        {(a.proximamente || a.descripcion) && <small>{a.proximamente ? "Próximamente" : a.descripcion}</small>}
      </span>
      {a.href && !a.proximamente && <Flecha />}
    </>
  );
  return a.href && !a.proximamente ? (
    <Link href={a.href} className={styles.opcion}>
      {contenido}
    </Link>
  ) : (
    <div className={`${styles.opcion} ${styles.opcionApagada}`} aria-disabled="true">
      {contenido}
    </div>
  );
}

// Cuadrícula de opciones: tarjetas blancas con icono, título y una línea de descripción. Las que aún no llevan a ningún sitio salen apagadas con «Próximamente».
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
