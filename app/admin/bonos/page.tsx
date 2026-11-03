import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { formasActivas, nombresFormas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { BotonPagado } from "./Controles";
import HistorialPagos, { type FilaPago } from "./HistorialPagos";
import RegistrarPago from "./RegistrarPago";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Pagos · Administración" };

type Tipo = { id: string; nombre: string; servicio: string; precio_centimos: number; iva_porcentaje: number; activo: boolean };
type DescuentoLista = {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  caduca_en: string | null;
  usos_max: number | null;
  pagos: { estado: string }[];
};
type Alumno = { id: string; nombre: string | null; apellidos: string | null; email: string | null };
type PagoPendiente = {
  id: string;
  importe_centimos: number;
  descuento_centimos: number;
  metodo: string;
  creado_en: string;
  profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null;
  bonos: { tipos_bono: { nombre: string } | null } | null;
};

function nombreDe(p: { nombre: string | null; apellidos: string | null; email: string | null }) {
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function AdminBonos() {
  const { supabase } = await requireAdmin("pagos");
  const [formas, METODOS] = await Promise.all([formasActivas(), nombresFormas()]);

  // Pone al día caducidades y bonos agotados antes de mostrar nada.
  await createAdminClient().rpc("refrescar_bonos");

  const { data: tiposDatos } = await supabase
    .from("tipos_bono")
    .select("id, nombre, servicio, precio_centimos, iva_porcentaje, activo")
    .order("orden");
  const tipos = (tiposDatos ?? []) as Tipo[];

  const { data: pendientesDatos } = await supabase
    .from("pagos")
    .select(
      "id, importe_centimos, descuento_centimos, metodo, creado_en, profiles(nombre, apellidos, email), bonos(tipos_bono(nombre))",
    )
    .eq("estado", "pendiente")
    .order("creado_en");
  const pendientes = (pendientesDatos ?? []) as unknown as PagoPendiente[];

  // Descuentos que se pueden elegir ahora: activos, sin caducar y con usos libres.
  const { data: descuentosDatos } = await supabase
    .from("descuentos")
    .select("id, nombre, tipo, valor, caduca_en, usos_max, pagos(estado)")
    .eq("activo", true)
    .order("nombre");
  const hoy = new Date().toISOString().slice(0, 10);
  const descuentos = ((descuentosDatos ?? []) as unknown as DescuentoLista[])
    .filter(
      (d) =>
        (d.caduca_en === null || d.caduca_en >= hoy) &&
        (d.usos_max === null || d.pagos.filter((p) => p.estado !== "anulado").length < d.usos_max),
    )
    .map((d) => ({
      id: d.id,
      tipo: d.tipo,
      valor: d.valor,
      texto: `${d.nombre} · ${d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}`,
    }));

  const { data: alumnosDatos } = await supabase
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .eq("rol", "alumno")
    .order("nombre");
  const alumnos = (alumnosDatos ?? []) as Alumno[];

  // Historial: todos los pagos, del más reciente al más antiguo.
  const { data: historialDatos } = await supabase
    .from("pagos")
    .select("id, user_id, importe_centimos, descuento_centimos, metodo, estado, creado_en, pagado_en, persona_nombre, profiles(nombre, apellidos, email, telefono), bonos(tipos_bono(nombre))")
    .order("creado_en", { ascending: false })
    .limit(1000);
  // Facturas de esos pagos (FS la normal, FSR la rectificativa de un pago anulado).
  const idsPagos = ((historialDatos ?? []) as { id: string }[]).map((h) => h.id);
  const { data: facturasDatos } = idsPagos.length
    ? await createAdminClient().from("facturas").select("pago_id, tipo, anio, numero").in("pago_id", idsPagos)
    : { data: [] };
  const facturasPorPago = new Map<string, { numero: string; enlace: string }[]>();
  for (const f of (facturasDatos ?? []) as { pago_id: string; tipo: string; anio: number; numero: number }[]) {
    const rect = f.tipo === "rectificativa";
    const fila = { numero: `${rect ? "FSR" : "FS"}-${f.anio}-${String(f.numero).padStart(3, "0")}`, enlace: `/pagos/recibo/${f.pago_id}${rect ? "" : "?tipo=original"}` };
    facturasPorPago.set(f.pago_id, [...(facturasPorPago.get(f.pago_id) ?? []), fila]);
  }
  const historial: FilaPago[] = ((historialDatos ?? []) as unknown as (Omit<PagoPendiente, "profiles"> & {
    user_id: string | null;
    profiles: { nombre: string | null; apellidos: string | null; email: string | null; telefono: string | null } | null;
    estado: string;
    pagado_en: string | null;
    persona_nombre: string | null;
  })[])
    .map((h) => ({
      id: h.id,
      persona: h.profiles ? nombreDe(h.profiles) : h.persona_nombre || "(persona borrada)",
      userId: h.profiles ? h.user_id : null,
      telefono: h.profiles?.telefono ?? null,
      email: h.profiles?.email ?? null,
      tarifa: h.bonos?.tipos_bono?.nombre ?? "Pago suelto",
      importe: h.importe_centimos,
      descuento: h.descuento_centimos,
      metodo: h.metodo,
      metodoNombre: METODOS[h.metodo] ?? h.metodo,
      estado: h.estado,
      fecha: h.pagado_en ?? h.creado_en,
      facturas: facturasPorPago.get(h.id) ?? [],
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const ahoraIso = new Date().toISOString();

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Pagos</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <div style={{ marginBottom: 14 }}>
        <RegistrarPago
          formas={formas}
          hoy={claveDia(ahoraIso)}
          ahora={textoHora(ahoraIso)}
          alumnos={alumnos.map((a) => ({
            id: a.id,
            texto: `${nombreDe(a)}${a.email && a.nombre ? " · " + a.email : ""}`,
          }))}
          tipos={tipos
            .filter((t) => t.activo)
            .map((t) => ({ id: t.id, texto: `${t.nombre} · ${euros(t.precio_centimos)}`, precio: t.precio_centimos }))}
          descuentos={descuentos}
        />
      </div>

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
                    {p.bonos?.tipos_bono?.nombre ?? "Pago"} · {METODOS[p.metodo] ?? p.metodo} · {fechaCorta(p.creado_en)}
                  </div>
                </div>
                <span className={styles.etiqueta}>
                  {euros(p.importe_centimos)}
                  {p.descuento_centimos > 0 && ` (descuento −${euros(p.descuento_centimos)})`}
                </span>
              </div>
              <BotonPagado pagoId={p.id} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.tarjeta}>
        <h2>Historial de pagos</h2>
        <HistorialPagos pagos={historial} />
      </section>
    </main>
  );
}
