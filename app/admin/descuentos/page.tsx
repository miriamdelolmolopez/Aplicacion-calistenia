import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import styles from "../admin.module.css";
import { AccionesDescuento, NuevoDescuento } from "./Controles";

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
  const descuentos = (data ?? []) as unknown as Descuento[];
  const hoy = new Date().toISOString().slice(0, 10);

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
          Los descuentos los aplicas tú al registrar un bono (en «Bonos y pagos»). El pago guarda el precio
          original, el descuento y el total, y la alumna lo ve en «Mis pagos». Un descuento que ya se ha usado
          no se puede borrar, solo desactivar.
        </p>
      </section>

      <section className={styles.tarjeta}>
        <h2>Descuentos ({descuentos.length})</h2>
        {descuentos.length === 0 && <p className={styles.ayuda}>Todavía no has creado ningún descuento.</p>}
        <ul className={styles.lista}>
          {descuentos.map((d) => {
            const usos = d.pagos.filter((p) => p.estado !== "anulado").length;
            const caducado = d.caduca_en !== null && d.caduca_en < hoy;
            const agotado = d.usos_max !== null && usos >= d.usos_max;
            return (
              <li key={d.id} className={styles.persona}>
                <div className={styles.personaCabecera}>
                  <div>
                    <strong>{d.nombre}</strong>
                    <div className={styles.ayuda}>
                      {d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}
                      {d.caduca_en && ` · caduca ${fechaCorta(d.caduca_en)}`}
                      {` · usado ${usos}${d.usos_max !== null ? ` de ${d.usos_max}` : ""} ${usos === 1 ? "vez" : "veces"}`}
                    </div>
                  </div>
                  <span className={styles.etiquetaSuave}>
                    {!d.activo ? "Desactivado" : caducado ? "Caducado" : agotado ? "Agotado" : "Disponible"}
                  </span>
                </div>
                <AccionesDescuento id={d.id} activo={d.activo} nombre={d.nombre} />
              </li>
            );
          })}
        </ul>
      </section>

      <NuevoDescuento />
    </main>
  );
}
