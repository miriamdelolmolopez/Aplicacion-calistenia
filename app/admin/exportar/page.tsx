import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";

export const metadata = { title: "Descargar datos · Administración" };

const ARCHIVOS = [
  { tipo: "alumnos", titulo: "Alumnos", ayuda: "Datos de cada persona y sus servicios." },
  { tipo: "pagos", titulo: "Pagos", ayuda: "Todos los pagos con su persona, importe y método." },
  { tipo: "bonos", titulo: "Bonos", ayuda: "Bonos comprados, clases restantes y caducidad." },
  { tipo: "reservas", titulo: "Historial de clases", ayuda: "Todas las reservas, canceladas y de prueba." },
  { tipo: "aceptaciones", titulo: "Aceptaciones legales", ayuda: "Quién aceptó los términos y la privacidad, y cuándo." },
];

export default async function Exportar() {
  await requireAdmin();
  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Descargar datos</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>
      <p className={styles.aviso}>
        Cada botón descarga un archivo CSV que se abre con Excel o Google Sheets. Contiene datos personales y de
        salud: guárdalo en un sitio seguro y bórralo cuando ya no lo necesites.
      </p>
      <section className={styles.tarjeta}>
        {ARCHIVOS.map((a) => (
          <div key={a.tipo} style={{ marginBottom: 14 }}>
            <a href={`/admin/exportar/${a.tipo}`} download className={styles.boton}>
              Descargar {a.titulo}
            </a>
            <p className={styles.ayuda}>{a.ayuda}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
