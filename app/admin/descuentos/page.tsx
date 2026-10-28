import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import ListaDescuentos, { type FilaDescuento } from "./ListaDescuentos";

export const metadata = { title: "Descuentos · Administración" };

type Descuento = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  activo: boolean;
  caduca_en: string | null;
  usos_max: number | null;
  pagos: { estado: string }[];
};

export default async function Descuentos() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("descuentos")
    .select("id, nombre, tipo, valor, activo, caduca_en, usos_max, pagos(estado)")
    .order("creado_en", { ascending: false });
  const hoy = new Date().toISOString().slice(0, 10);

  const filas: FilaDescuento[] = ((data ?? []) as unknown as Descuento[]).map((d) => {
    const usos = d.pagos.filter((p) => p.estado !== "anulado").length;
    const caducado = d.caduca_en !== null && d.caduca_en < hoy;
    const agotado = d.usos_max !== null && usos >= d.usos_max;
    return {
      id: d.id,
      nombre: d.nombre,
      tipo: d.tipo,
      valor: d.valor,
      activo: d.activo,
      caduca_en: d.caduca_en,
      usos_max: d.usos_max,
      usos,
      situacion: !d.activo ? "desactivado" : caducado ? "caducado" : agotado ? "agotado" : "disponible",
    };
  });

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Descuentos</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>
          Los descuentos los aplicas tú al registrar un pago (en «Pagos»). El pago guarda el precio original, el descuento y el total, y la
          alumna lo ve en «Mis pagos». Un descuento que ya se ha usado no se puede eliminar, solo desactivar.
        </p>
        <ListaDescuentos descuentos={filas} />
      </section>
    </main>
  );
}
