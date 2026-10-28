import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import type { TipoBono } from "./FormularioTarifa";
import ListaTarifas from "./ListaTarifas";

export const metadata = { title: "Tarifas · Administración" };

export default async function Tarifas() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("tipos_bono")
    .select("id, nombre, servicio, clases, precio_centimos, validez_dias, orden, activo, requiere_pago, servicio2, clases2, iva_porcentaje, validez_dias2")
    .order("orden")
    .order("servicio")
    .order("precio_centimos");

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Tarifas</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>
          Aquí decides qué se vende, a qué precio, con qué IVA, cuántas clases (créditos) incluye y cuándo caduca. Cambiar una tarifa no afecta a
          lo que ya has vendido. Si no quieres vender una, desactívala en vez de eliminarla.
        </p>
        <ListaTarifas tarifas={(data ?? []) as TipoBono[]} />
      </section>
    </main>
  );
}
