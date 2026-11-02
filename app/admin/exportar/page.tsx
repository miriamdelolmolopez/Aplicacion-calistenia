import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Descargar datos · Administración" };

const ARCHIVOS = [
  { tipo: "alumnos", titulo: "Alumnos/as", ayuda: "Datos de cada persona y sus servicios. Incluye también a las personas archivadas (columna «Archivada el»)." },
  { tipo: "pagos", titulo: "Pagos", ayuda: "Todos los pagos con su persona, importe y método." },
  { tipo: "bonos", titulo: "Bonos", ayuda: "Bonos comprados, clases restantes y caducidad." },
  { tipo: "reservas", titulo: "Historial de clases", ayuda: "Todas las reservas, canceladas y de prueba." },
  { tipo: "aceptaciones", titulo: "Aceptaciones legales", ayuda: "Quién aceptó los términos y la privacidad, y cuándo." },
];

export default async function Exportar() {
  await requireAdmin("exportar");
  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Descargar datos (CSV)</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <p className={styles.aviso}>
        Cada botón descarga un archivo CSV que se abre con Excel o Google Sheets. Contiene datos personales y de
        salud: guárdalo en un sitio seguro y bórralo cuando ya no lo necesites.
      </p>
      <section className={styles.tarjeta}>
        <div style={{ marginBottom: 14 }}>
          <a href="/admin/exportar/todo" download className={styles.boton}>
            Descargar todo junto (una tabla)
          </a>
          <p className={styles.ayuda}>Una sola tabla con una fila por persona y una única fila de títulos, lista para filtrar en Excel: datos personales, bono actual, pagos, clases y aceptaciones legales. El detalle de cada pago o clase está en los botones de abajo.</p>
        </div>
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
