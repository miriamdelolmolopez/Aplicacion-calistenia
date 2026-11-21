import Link from "next/link";
import type { ReactNode } from "react";
import Icono, { type NombreIcono } from "../Icono";
import estilos from "./seccion.module.css";

// Tarjeta de sección (estilo panel limpio): cabecera con icono en un cuadrito suave, título, texto a la derecha y filas debajo.
export default function Seccion({ icono, titulo, derecha, href, children }: { icono: NombreIcono; titulo: string; derecha?: ReactNode; href?: string; children: ReactNode }) {
  const cabecera = (
    <>
      <span className={estilos.chip} aria-hidden="true">
        <Icono nombre={icono} tamano={16} />
      </span>
      <h2 className={estilos.titulo}>{titulo}</h2>
      {derecha && <span className={estilos.derecha}>{derecha}</span>}
    </>
  );
  return (
    <section className={estilos.seccion}>
      {href ? (
        <Link href={href} className={estilos.cabecera}>
          {cabecera}
        </Link>
      ) : (
        <header className={estilos.cabecera}>{cabecera}</header>
      )}
      <div className={estilos.cuerpo}>{children}</div>
    </section>
  );
}

// Fila de una sección: miniatura o icono a la izquierda, título y subtítulo, y a la derecha un círculo de estado o una flecha.
export function Fila({ icono, titulo, sub, estado, href }: { icono: NombreIcono; titulo: string; sub?: string; estado?: "pendiente" | "hecho" | "flecha"; href?: string }) {
  const contenido = (
    <>
      <span className={estilos.miniatura} aria-hidden="true">
        <Icono nombre={icono} tamano={20} />
      </span>
      <span className={estilos.textos}>
        <strong>{titulo}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {estado === "pendiente" && <span className={estilos.circulo} aria-hidden="true" />}
      {estado === "hecho" && (
        <span className={`${estilos.circulo} ${estilos.hecho}`} aria-hidden="true">
          ✓
        </span>
      )}
      {estado === "flecha" && (
        <span className={estilos.flecha} aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={estilos.fila}>
      {contenido}
    </Link>
  ) : (
    <div className={estilos.fila}>{contenido}</div>
  );
}

// Cuadrícula de accesos pequeños (Recursos): cada uno con su icono y nombre.
export function Accesos({ items }: { items: { href: string; icono: NombreIcono; texto: string }[] }) {
  return (
    <div className={estilos.accesos}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={estilos.acceso}>
          <Icono nombre={i.icono} tamano={20} />
          <span>{i.texto}</span>
        </Link>
      ))}
    </div>
  );
}
