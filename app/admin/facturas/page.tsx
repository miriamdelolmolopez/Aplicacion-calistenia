import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaFacturas, { type FilaFactura } from "./ListaFacturas";

export const metadata = { title: "Facturas · Administración" };

// Todas las facturas emitidas: las normales (FS) y las rectificativas (FSR), para bajarlas en PDF.
export default async function Facturas() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: facturas } = await admin.from("facturas").select("id, pago_id, tipo, anio, numero, emitida_en").order("emitida_en", { ascending: false });
  const lista = (facturas ?? []) as { id: string; pago_id: string; tipo: string; anio: number; numero: number; emitida_en: string }[];

  const pagoIds = [...new Set(lista.map((f) => f.pago_id))];
  const { data: pagos } = pagoIds.length
    ? await admin.from("pagos").select("id, user_id, importe_centimos").in("id", pagoIds)
    : { data: [] };
  const porPago = new Map(((pagos ?? []) as { id: string; user_id: string | null; importe_centimos: number }[]).map((p) => [p.id, p]));
  const userIds = [...new Set([...porPago.values()].map((p) => p.user_id).filter((x): x is string => !!x))];
  const { data: perfiles } = userIds.length
    ? await admin.from("profiles").select("id, nombre, apellidos, email").in("id", userIds)
    : { data: [] };
  const nombre = new Map(
    ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null }[]).map((p) => [p.id, [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)"]),
  );

  const filas: FilaFactura[] = lista.map((f) => {
    const p = porPago.get(f.pago_id);
    const rect = f.tipo === "rectificativa";
    return {
      id: f.id,
      numero: `${rect ? "FSR" : "FS"}-${f.anio}-${String(f.numero).padStart(3, "0")}`,
      rectificativa: rect,
      anio: f.anio,
      emitidaEn: f.emitida_en,
      persona: (p?.user_id && nombre.get(p.user_id)) || "(sin persona)",
      centimos: (p?.importe_centimos ?? 0) * (rect ? -1 : 1),
      // La normal se pide siempre como «original»; la rectificativa es la que sale por defecto en un pago anulado.
      enlace: `/pagos/recibo/${f.pago_id}${rect ? "" : "?tipo=original"}`,
    };
  });

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Facturas</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>
      <ListaFacturas filas={filas} />
    </main>
  );
}
