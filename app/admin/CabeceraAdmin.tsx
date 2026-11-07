import type { ReactNode } from "react";
import VerComoAlumno from "./VerComoAlumno";
import styles from "./admin.module.css";

// Cabecera de cada pantalla de Administración: el título, el botón de volver y el ojo para ver la app como un/a alumno/a.
export default function CabeceraAdmin({ children }: { children: ReactNode }) {
  return (
    <header className={styles.barra}>
      {children}
      <VerComoAlumno destino="/inicio" porDefecto />
    </header>
  );
}
