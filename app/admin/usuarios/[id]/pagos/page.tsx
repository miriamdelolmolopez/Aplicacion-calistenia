import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { formasActivas, nombresFormas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../../admin.module.css";
import estilos from "../../usuarios.module.css";
import { FormGuiado, FormManual, HistorialPersona, type FilaPagoPersona } from "./FormulariosPago";

export const metadata = { title: "Pagos de la persona · Administración" };

const PESTANAS = [
  { id: "guiado", texto: "Nuevo guiado" },
  { id: "historial", texto: "Historial" },
  { id: "manual", texto: "Nuevo manual" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

type Tipo = { id: string; nombre: string; servicio: string; precio_centimos: number; iva_porcentaje: number; clases: number; validez_dias: number };
type BonoFila = { id: string; servicio: string; estado: string; clases_restantes: number; tipo_bono_id: string; caduca_en: string | null; creado_en: string; tipos_bono: { nombre: string } | null };
type PagoFila = {
  id: string;
  bono_id: string | null;
  importe_centimos: number;
  descuento_centimos: number;
  metodo: string;
  estado: string;
  creado_en: string;
  pagado_en: string | null;
  periodo: string | null;
  nota: string | null;
  bonos: { tipo_bono_id: string; tipos_bono: { nombre: string } | null } | null;
};
type DescuentoFila = { id: string; nombre: string; tipo: string; valor: number; caduca_en: string | null; usos_max: number | null; pagos: { estado: string }[] };

export default async function PagosPersona({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pestana?: string }> }) {
  const { id } = await params;
  const { pestana: pedida } = await searchParams;
  const pestana: Pestana = PESTANAS.some((x) => x.id === pedida) ? (pedida as Pestana) : "guiado";
  await requireAdmin();
  const admin = createAdminClient();
  const [formas, METODOS] = await Promise.all([formasActivas(), nombresFormas()]);

  const { data: p } = await admin.from("profiles").select("id, nombre, apellidos, email, rol").eq("id", id).maybeSingle();
  if (!p || p.rol === "admin") notFound();
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";

  await admin.rpc("refrescar_bonos", { p_user: id });

  const [{ data: tiposDatos }, { data: bonosDatos }, { data: pagosDatos }, { data: descuentosDatos }] = await Promise.all([
    admin.from("tipos_bono").select("id, nombre, servicio, precio_centimos, iva_porcentaje, clases, validez_dias").eq("activo", true).order("servicio").order("orden"),
    admin.from("bonos").select("id, servicio, estado, clases_restantes, tipo_bono_id, caduca_en, creado_en, tipos_bono(nombre)").eq("user_id", id).order("creado_en", { ascending: false }),
    admin
      .from("pagos")
      .select("id, bono_id, importe_centimos, descuento_centimos, metodo, estado, creado_en, pagado_en, periodo, nota, bonos(tipo_bono_id, tipos_bono(nombre))")
      .eq("user_id", id)
      .order("creado_en", { ascending: false }),
    admin.from("descuentos").select("id, nombre, tipo, valor, caduca_en, usos_max, pagos(estado)").eq("activo", true).order("nombre"),
  ]);
  const tipos = (tiposDatos ?? []) as Tipo[];
  const bonos = (bonosDatos ?? []) as unknown as BonoFila[];
  const pagos = (pagosDatos ?? []) as unknown as PagoFila[];

  const ahoraIso = new Date().toISOString();
  const hoy = claveDia(ahoraIso);
  const ahora = textoHora(ahoraIso);

  // Descuentos que se pueden elegir ahora: activos, sin caducar y con usos libres.
  const descuentos = ((descuentosDatos ?? []) as unknown as DescuentoFila[])
    .filter((d) => (d.caduca_en === null || d.caduca_en >= hoy) && (d.usos_max === null || d.pagos.filter((x) => x.estado !== "anulado").length < d.usos_max))
    .map((d) => ({ id: d.id, tipo: d.tipo, valor: d.valor, texto: `${d.nombre} · ${d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}` }));

  // Créditos que tiene ahora por servicio (activos y en espera).
  const creditos: Record<string, number> = {};
  for (const b of bonos) if (b.estado === "activo" || b.estado === "en_cola") creditos[b.servicio] = (creditos[b.servicio] ?? 0) + b.clases_restantes;

  const pendientes = pagos.filter((x) => x.estado === "pendiente").map((x) => ({ id: x.id, tipoId: x.bonos?.tipo_bono_id ?? null, importe: x.importe_centimos, metodo: x.metodo }));
  const totalPendiente = pendientes.reduce((n, x) => n + x.importe, 0);

  const filas: FilaPagoPersona[] = pagos.map((x) => {
    const concepto = x.bonos?.tipos_bono?.nombre ?? x.nota ?? "Pago suelto";
    const cuando = x.pagado_en ?? x.creado_en;
    return {
      id: x.id,
      concepto,
      importe: x.importe_centimos,
      descuento: x.descuento_centimos,
      metodo: x.metodo,
      metodoNombre: METODOS[x.metodo] ?? x.metodo,
      estado: x.estado,
      fecha: `${fechaCorta(cuando)} ${textoHora(cuando)}`,
      periodo: x.periodo,
      nota: x.bonos?.tipos_bono?.nombre ? x.nota : null,
    };
  });

  const bonosOpcion = bonos
    .filter((b) => b.estado === "activo" || b.estado === "en_cola")
    .map((b) => ({ id: b.id, texto: `${b.tipos_bono?.nombre ?? "Bono"} · ${b.estado === "activo" ? "activo" : "en espera"} · ${b.clases_restantes} clases` }));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Pagos</h1>
        <Link href={`/admin/usuarios/${id}`} className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <strong style={{ fontSize: "1.1rem" }}>{nombre}</strong>
        <div className={styles.ayuda}>{p.email}</div>
        {totalPendiente > 0 ? <div className={estilos.sinPagar}>Tiene {euros(totalPendiente)} pendientes de cobrar</div> : <div className={styles.ayuda}>No tiene nada pendiente de cobrar.</div>}
      </section>

      <nav className={estilos.pestanas} aria-label="Secciones de los pagos">
        {PESTANAS.map((x) => (
          <Link key={x.id} href={`/admin/usuarios/${id}/pagos?pestana=${x.id}`} className={`${estilos.pestana} ${pestana === x.id ? estilos.pestanaActiva : ""}`} aria-current={pestana === x.id ? "page" : undefined}>
            {x.texto}
          </Link>
        ))}
      </nav>

      {pestana === "guiado" && (
        <FormGuiado
          userId={id}
          hoy={hoy}
          ahora={ahora}
          formas={formas}
          descuentos={descuentos}
          ultimoTipoId={bonos[0]?.tipo_bono_id ?? null}
          creditos={creditos}
          pendientes={pendientes}
          tipos={tipos.map((t) => ({ id: t.id, nombre: t.nombre, servicio: t.servicio, precio: t.precio_centimos, iva: t.iva_porcentaje, clases: t.clases, validez: t.validez_dias }))}
        />
      )}

      {pestana === "historial" && (
        <section className={styles.tarjeta}>
          <h2>Historial de pagos</h2>
          <HistorialPersona userId={id} pagos={filas} formas={formas} hoy={hoy} ahora={ahora} />
        </section>
      )}

      {pestana === "manual" && <FormManual userId={id} hoy={hoy} ahora={ahora} formas={formas} bonos={bonosOpcion} />}
    </main>
  );
}
