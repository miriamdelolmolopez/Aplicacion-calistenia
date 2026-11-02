"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { seccionDeRuta } from "@/lib/seccionesAdmin";
import styles from "./admin.module.css";

// Si la administradora entra (por un enlace o por la barra de direcciones) en una sección que tiene excluida, no se le enseña nada.
export default function GuardaSecciones({ excluidas, children }: { excluidas: string[]; children: React.ReactNode }) {
  const ruta = usePathname();
  const seccion = seccionDeRuta(ruta);
  if (seccion && excluidas.includes(seccion)) {
    return (
      <main className={styles.pagina}>
        <section className={styles.tarjeta}>
          <h1>No tienes acceso a esta sección</h1>
          <p className={styles.ayuda}>Quien te dio acceso de administradora la ha excluido de tu cuenta. Si la necesitas, pídesela.</p>
          <Link href="/admin" className={styles.boton}>
            Volver a Administración
          </Link>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
