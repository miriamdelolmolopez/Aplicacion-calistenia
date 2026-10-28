import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { todasLasFormas } from "@/lib/formasPago";
import styles from "../admin.module.css";
import ListaFormas from "./ListaFormas";

export const metadata = { title: "Formas de pago · Administración" };

export default async function FormasPago() {
  await requireAdmin();
  const formas = await todasLasFormas();

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Formas de pago</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <p className={styles.ayuda}>
        Son las opciones que ves en «¿Cómo paga?» al dar de alta a alguien o registrar un bono. Cambiar un nombre también lo cambia en los pagos
        antiguos y en los informes. Una forma que ya se ha usado en algún pago no se puede eliminar: desactívala.
      </p>

      <section className={styles.tarjeta}>
        {formas.length === 0 && <p className={styles.ayuda}>Todavía no hay ninguna. Falta ejecutar el archivo 040 en Supabase.</p>}
        <ListaFormas formas={formas} />
      </section>
    </main>
  );
}
