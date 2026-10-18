import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { BotonPagado, EditorBono, FormularioPrecio, FormularioRegistrar } from "./Controles";

export const metadata = { title: "Bonos y pagos · Administración" };

const ESTADOS: Record<string, string> = {
  activo: "Activo",
  en_cola: "En espera",
  agotado: "Agotado",
  caducado: "Caducado",
  anulado: "Anulado",
};

const METODOS: Record<string, string> = {
  efectivo: "Efectivo",
  bizum: "Bizum",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

type Tipo = { id: string; nombre: string; precio_centimos: number; activo: boolean };
type Pago = { id: string; estado: string; metodo: string; importe_centimos: number };
type Bono = {
  id: string;
  estado: string;
  clases_total: number;
  clases_restantes: number;
  caduca_en: string | null;
  creado_en: string;
  tipos_bono: { nombre: string } | null;
  pagos: Pago[];
};
type Alumno = {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  bonos: Bono[];
};
type PagoPendiente = {
  id: string;
  importe_centimos: number;
  metodo: string;
  creado_en: string;
  profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null;
  bonos: { tipos_bono: { nombre: string } | null } | null;
};

function nombreDe(p: { nombre: string | null; apellidos: string | null; email: string | null }) {
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function AdminBonos() {
  const { supabase } = await requireAdmin();

  // Pone al día caducidades y bonos agotados antes de mostrar nada.
  await createAdminClient().rpc("refrescar_bonos");

  const { data: tiposDatos } = await supabase
    .from("tipos_bono")
    .select("id, nombre, precio_centimos, activo")
    .order("orden");
  const tipos = (tiposDatos ?? []) as Tipo[];

  const { data: pendientesDatos } = await supabase
    .from("pagos")
    .select(
      "id, importe_centimos, metodo, creado_en, profiles(nombre, apellidos, email), bonos(tipos_bono(nombre))",
    )
    .eq("estado", "pendiente")
    .order("creado_en");
  const pendientes = (pendientesDatos ?? []) as unknown as PagoPendiente[];

  const { data: alumnosDatos } = await supabase
    .from("profiles")
    .select(
      "id, nombre, apellidos, email, bonos(id, estado, clases_total, clases_restantes, caduca_en, creado_en, tipos_bono(nombre), pagos(id, estado, metodo, importe_centimos))",
    )
    .eq("rol", "alumno")
    .order("nombre");
  const alumnos = (alumnosDatos ?? []) as unknown as Alumno[];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Bonos y pagos</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Pagos pendientes ({pendientes.length})</h2>
        {pendientes.length === 0 && <p className={styles.ayuda}>No hay nada pendiente de cobrar.</p>}
        <ul className={styles.lista}>
          {pendientes.map((p) => (
            <li key={p.id} className={styles.persona}>
              <div className={styles.personaCabecera}>
                <div>
                  <strong>{p.profiles ? nombreDe(p.profiles) : "(persona borrada)"}</strong>
                  <div className={styles.ayuda}>
                    {p.bonos?.tipos_bono?.nombre ?? "Bono"} · {METODOS[p.metodo] ?? p.metodo} ·{" "}
                    {fechaCorta(p.creado_en)}
                  </div>
                </div>
                <span className={styles.etiqueta}>{euros(p.importe_centimos)}</span>
              </div>
              <BotonPagado pagoId={p.id} />
            </li>
          ))}
        </ul>
      </section>

      <FormularioRegistrar
        alumnos={alumnos.map((a) => ({
          id: a.id,
          texto: `${nombreDe(a)}${a.email && a.nombre ? " · " + a.email : ""}`,
        }))}
        tipos={tipos
          .filter((t) => t.activo)
          .map((t) => ({ id: t.id, texto: `${t.nombre} · ${euros(t.precio_centimos)}` }))}
      />

      <section className={styles.tarjeta}>
        <h2>Bonos de cada alumno</h2>
        {alumnos.length === 0 && <p className={styles.ayuda}>Todavía no hay alumnos.</p>}
        <ul className={styles.lista}>
          {alumnos.map((a) => {
            const bonos = [...a.bonos].sort((x, y) => y.creado_en.localeCompare(x.creado_en));
            return (
              <li key={a.id} className={styles.persona}>
                <strong>{nombreDe(a)}</strong>
                {bonos.length === 0 && <p className={styles.ayuda}>Sin bonos.</p>}
                {bonos.map((b) => {
                  const pago = b.pagos[0];
                  return (
                    <div key={b.id} className={styles.bonoFila}>
                      <div className={styles.personaCabecera}>
                        <div>
                          <strong>{b.tipos_bono?.nombre}</strong>
                          <div className={styles.ayuda}>
                            {b.clases_restantes} de {b.clases_total} clases
                            {b.caduca_en && ` · caduca ${fechaCorta(b.caduca_en)}`}
                          </div>
                          {pago && (
                            <div className={styles.ayuda}>
                              {euros(pago.importe_centimos)} · {METODOS[pago.metodo] ?? pago.metodo} ·{" "}
                              {pago.estado === "pagado"
                                ? "cobrado"
                                : pago.estado === "pendiente"
                                  ? "PENDIENTE DE COBRO"
                                  : "anulado"}
                            </div>
                          )}
                        </div>
                        <span className={styles.etiquetaSuave}>{ESTADOS[b.estado] ?? b.estado}</span>
                      </div>
                      <EditorBono bonoId={b.id} anulado={b.estado === "anulado"} />
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.tarjeta}>
        <h2>Precios del catálogo</h2>
        <p className={styles.ayuda}>
          Precios con IVA incluido. Cambiarlos no afecta a los bonos ya registrados.
        </p>
        {tipos.map((t) => (
          <FormularioPrecio
            key={t.id}
            tipo={{
              id: t.id,
              nombre: t.nombre,
              precio: (t.precio_centimos / 100).toFixed(2).replace(".", ","),
            }}
          />
        ))}
      </section>
    </main>
  );
}
