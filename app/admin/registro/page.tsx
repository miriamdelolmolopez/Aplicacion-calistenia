import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { registroAbierto } from "@/lib/registro";
import styles from "../admin.module.css";
import ControlRegistro from "../prueba/ControlRegistro";

export const metadata = { title: "Registro · Administración" };

export default async function Registro() {
  await requireAdmin();
  const abierto = await registroAbierto();

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Registro</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Registro de la app</h2>
        <p className={styles.ayuda}>
          Cerrado (recomendado mientras la app sea solo para tus alumnas): nadie puede crear una cuenta por su cuenta. Entran las personas que das de alta tú y quien llega
          con el link de prueba gratuita. Ábrelo el día que quieras admitir registros libres (por ejemplo, una academia o un curso con membresía).
        </p>
        <ControlRegistro abierto={abierto} />
      </section>
    </main>
  );
}
