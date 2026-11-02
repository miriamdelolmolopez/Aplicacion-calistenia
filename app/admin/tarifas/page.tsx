import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import type { TipoBono } from "./FormularioTarifa";
import ListaTarifas from "./ListaTarifas";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Servicios · Administración" };

export default async function Tarifas() {
  const { supabase } = await requireAdmin("tarifas");

  const { data } = await supabase
    .from("tipos_bono")
    .select("id, nombre, servicio, clases, precio_centimos, validez_dias, orden, activo, requiere_pago, servicio2, clases2, iva_porcentaje, validez_dias2")
    .not("nombre", "like", "Prueba gratuita · %") // las pruebas de invitados son internas
    .order("orden")
    .order("servicio")
    .order("precio_centimos");

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Servicios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

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
