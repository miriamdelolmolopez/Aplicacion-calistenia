import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { euros } from "@/lib/formato";
import styles from "../admin.module.css";
import { FormularioTipoBono, type TipoBono } from "./Controles";

export const metadata = { title: "Bonos y clases sueltas · Administración" };

const NOMBRE_SERVICIO: Record<string, string> = { grupal: "grupales", individual: "individuales", online: "online" };

function validezTexto(dias: number): string {
  if (dias % 30 === 0) {
    const m = dias / 30;
    return `${dias} días (${m} ${m === 1 ? "mes" : "meses"})`;
  }
  return `${dias} días`;
}

// Resumen de lo que incluye un bono, por ejemplo «4 clases grupales + 4 individuales».
function contenido(t: TipoBono): string {
  const parte = (n: number, s: string) => (s === "online" ? "Plan online" : `${n} ${n === 1 ? "clase" : "clases"} ${NOMBRE_SERVICIO[s] ?? s}`);
  return [parte(t.clases, t.servicio), t.servicio2 && t.clases2 ? parte(t.clases2, t.servicio2) : null].filter(Boolean).join(" + ");
}

export default async function Tarifas({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista: v } = await searchParams;
  const { supabase } = await requireAdmin();
  const vista = v === "sueltas" ? "sueltas" : "bonos";

  const [{ data }, { data: tiposClase }] = await Promise.all([
    supabase
      .from("tipos_bono")
      .select("id, nombre, servicio, clases, precio_centimos, validez_dias, orden, activo, requiere_pago, servicio2, clases2")
      .order("orden")
      .order("servicio")
      .order("precio_centimos"),
    supabase.from("tipos_clase").select("nombre, servicio").eq("activo", true).order("orden").order("nombre"),
  ]);
  const todos = (data ?? []) as TipoBono[];
  const esSuelta = (t: TipoBono) => t.clases === 1 && t.servicio !== "online" && !t.servicio2;
  const lista = todos.filter((t) => (vista === "sueltas" ? esSuelta(t) : !esSuelta(t)));
  const clasesDe = (servicio: string) =>
    ((tiposClase ?? []) as { nombre: string; servicio: string }[]).filter((c) => c.servicio === servicio).map((c) => c.nombre);

  const pestana = (id: string, texto: string, n: number) => (
    <Link href={id === "bonos" ? "/admin/tarifas" : `/admin/tarifas?vista=${id}`} className={`${styles.chip} ${vista === id ? styles.chipActivo : ""}`}>
      {texto} ({n})
    </Link>
  );

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Bonos y clases sueltas</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <div className={styles.chips}>
        {pestana("bonos", "Bonos", todos.filter((t) => !esSuelta(t)).length)}
        {pestana("sueltas", "Clases sueltas", todos.filter(esSuelta).length)}
      </div>

      <p className={styles.ayuda}>
        Aquí decides qué se vende, a qué precio, cuántas clases (créditos) incluye y cuándo caduca. Cambiar un bono no afecta a los que ya has
        vendido. Si no quieres vender uno, desactívalo en vez de borrarlo. Cada bono vale para todas las clases de su servicio.
      </p>

      <FormularioTipoBono suelta={vista === "sueltas"} />

      <section className={styles.tarjeta}>
        <h2>{vista === "sueltas" ? "Clases sueltas" : "Bonos"}</h2>
        {lista.length === 0 && <p className={styles.ayuda}>No hay ninguno todavía.</p>}
        <ul className={styles.lista}>
          {lista.map((t) => (
            <li key={t.id} className={styles.persona}>
              <details className={styles.detalles}>
                <summary>
                  <strong>{t.nombre}</strong> · {euros(t.precio_centimos)} · {contenido(t)} · caduca a los {validezTexto(t.validez_dias)}
                  {!t.activo && " · desactivado"}
                </summary>
                <p className={styles.ayuda}>
                  Vale para:{" "}
                  {[t.servicio, t.servicio2]
                    .filter((s): s is string => !!s)
                    .map((s) => (s === "online" ? "entrenamiento online" : clasesDe(s).join(", ") || NOMBRE_SERVICIO[s]))
                    .join(" · ")}
                </p>
                <FormularioTipoBono tipo={t} />
              </details>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
