import type { ReactNode } from "react";
import styles from "./admin.module.css";

// Cabecera de cada pantalla de Administración: el título y el botón de volver, sin foto.
export default function CabeceraAdmin({ children }: { children: ReactNode }) {
  return <header className={styles.barra}>{children}</header>;
}
