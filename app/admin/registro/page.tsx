import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { registroAbierto } from "@/lib/registro";
import styles from "../admin.module.css";
import ControlRegistro from "../prueba/ControlRegistro";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Registro · Administración" };

export default async function Registro() {
  await requireAdmin();
  const abierto = await registroAbierto();

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Registro</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <h2>Registro de la app</h2>
        <p className={styles.ayuda}>
          Cerrado (recomendado mientras la app sea solo para tus alumnos/as): nadie puede crear una cuenta por su cuenta. Entran las personas que das de alta tú y quien llega
          con el link de prueba gratuita. Ábrelo el día que quieras admitir registros libres (por ejemplo, una academia o un curso con membresía).
        </p>
        <ControlRegistro abierto={abierto} />
      </section>
    </main>
  );
}
