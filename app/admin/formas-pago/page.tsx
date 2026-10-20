import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { todasLasFormas } from "@/lib/formasPago";
import styles from "../admin.module.css";
import { FormularioForma } from "./Controles";

export const metadata = { title: "Formas de pago · Administración" };

export default async function FormasPago() {
  await requireAdmin();
  const formas = await todasLasFormas();

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Formas de pago</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <p className={styles.ayuda}>
        Son las opciones que ves en «¿Cómo paga?» al dar de alta a alguien o registrar un bono. Cambiar un nombre también lo cambia en los pagos
        antiguos y en los informes. No se pueden borrar: si ya no la usas, desactívala.
      </p>

      <section className={styles.tarjeta}>
        <h2>Formas de pago ({formas.length})</h2>
        {formas.length === 0 && <p className={styles.ayuda}>Todavía no hay ninguna. Falta ejecutar el archivo 040 en Supabase.</p>}
        {formas.map((f) => (
          <details key={f.clave} className={styles.detalles}>
            <summary>
              {f.orden}. {f.nombre}
              {!f.activa && " · desactivada"}
            </summary>
            <FormularioForma forma={f} />
          </details>
        ))}
      </section>

      <FormularioForma />
    </main>
  );
}
