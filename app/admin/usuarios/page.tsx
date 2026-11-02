import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaUsuarios, { type Usuario } from "./ListaUsuarios";
import { formasActivas } from "@/lib/formasPago";
import NuevoUsuario, { type DescuentoOpcion, type TarifaOpcion } from "./NuevoUsuario";
import CabeceraAdmin from "../CabeceraAdmin";
import { claveDia, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";

export const metadata = { title: "Usuarios · Administración" };

type Fila = Omit<Usuario, "foto" | "tarifas" | "tarifa_desde" | "tarifa_hasta" | "pendiente_cobro"> & { foto_path: string | null };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ nuevo?: string; archivadas?: string }> }) {
  const { nuevo, archivadas } = await searchParams;
  const verArchivadas = archivadas === "1";
  const { supabase } = await requireAdmin();

  const { data } = await supabase.rpc("resumen_usuarios");
  const { data: administradoras } = await createAdminClient().from("profiles").select("id, nombre, apellidos, email").eq("rol", "admin").order("nombre");
  // Las personas archivadas no salen en la lista normal; con «Ver archivadas» salen solo ellas.
  const todas = (data ?? []) as Fila[];
  const hayArchivadas = todas.some((f) => f.rol === "archivado");
  const filas = todas.filter((f) => (f.rol === "archivado") === verArchivadas);

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = filas.map((f) => f.foto_path).filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };

  // Antes de mostrar las tarifas se pone al día lo que ya ha caducado o se ha agotado.
  await createAdminClient().rpc("refrescar_bonos");

  // Tarifa (bono) activa de cada persona, para filtrar y mostrar.
  const { data: bonosActivos } = await createAdminClient()
    .from("bonos")
    .select("user_id, activo_desde, caduca_en, tipos_bono(nombre)")
    .eq("estado", "activo");
  const tarifasDe = new Map<string, string[]>();
  const periodoDe = new Map<string, { desde: string | null; hasta: string | null }>();
  for (const b of (bonosActivos ?? []) as unknown as { user_id: string; activo_desde: string | null; caduca_en: string | null; tipos_bono: { nombre: string } | null }[]) {
    if (!b.tipos_bono) continue;
    tarifasDe.set(b.user_id, [...(tarifasDe.get(b.user_id) ?? []), b.tipos_bono.nombre]);
    const actual = periodoDe.get(b.user_id) ?? { desde: null, hasta: null };
    periodoDe.set(b.user_id, {
      desde: b.activo_desde && (!actual.desde || b.activo_desde < actual.desde) ? b.activo_desde : actual.desde,
      hasta: b.caduca_en && (!actual.hasta || b.caduca_en > actual.hasta) ? b.caduca_en : actual.hasta,
    });
  }

  // Lo que cada persona tiene pendiente de pagar.
  const { data: pendientesDatos } = await createAdminClient().from("pagos").select("user_id, importe_centimos").eq("estado", "pendiente");
  const pendienteDe = new Map<string, number>();
  for (const x of (pendientesDatos ?? []) as { user_id: string | null; importe_centimos: number }[]) {
    if (x.user_id) pendienteDe.set(x.user_id, (pendienteDe.get(x.user_id) ?? 0) + x.importe_centimos);
  }

  const [{ data: tarifasDatos }, { data: descuentosDatos }] = await Promise.all([
    createAdminClient()
      .from("tipos_bono")
      .select("id, nombre, servicio, precio_centimos, validez_dias")
      .eq("activo", true)
      .order("servicio")
      .order("precio_centimos"),
    createAdminClient().from("descuentos").select("id, nombre, tipo, valor, caduca_en, usos_max, pagos(estado)").eq("activo", true).order("nombre"),
  ]);
  const tarifas = (tarifasDatos ?? []) as TarifaOpcion[];

  // Para el alta con tarifa: hoy, la hora de ahora y los descuentos que se pueden elegir (activos, sin caducar y con usos libres).
  const ahoraIso = new Date().toISOString();
  const hoy = claveDia(ahoraIso);
  const ahora = textoHora(ahoraIso);
  const descuentos: DescuentoOpcion[] = ((descuentosDatos ?? []) as unknown as { id: string; nombre: string; tipo: string; valor: number; caduca_en: string | null; usos_max: number | null; pagos: { estado: string }[] }[])
    .filter((d) => (d.caduca_en === null || d.caduca_en >= hoy) && (d.usos_max === null || d.pagos.filter((x) => x.estado !== "anulado").length < d.usos_max))
    .map((d) => ({ id: d.id, tipo: d.tipo, valor: d.valor, texto: `${d.nombre} · ${d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}` }));

  const usuarios: Usuario[] = filas.map(({ foto_path, ...resto }) => ({
    ...resto,
    tarifas: tarifasDe.get(resto.id) ?? [],
    tarifa_desde: periodoDe.get(resto.id)?.desde ?? null,
    tarifa_hasta: periodoDe.get(resto.id)?.hasta ?? null,
    pendiente_cobro: pendienteDe.get(resto.id) ?? 0,
    foto: foto_path ? (firmadas?.find((f) => f.path === foto_path)?.signedUrl ?? null) : null,
  }));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Usuarios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <NuevoUsuario tarifas={tarifas} descuentos={descuentos} hoy={hoy} ahora={ahora} formas={await formasActivas()} abiertoInicial={nuevo === "1"} />
      {(administradoras ?? []).length > 0 && (
        <p className={styles.ayuda} style={{ margin: "0 0 8px" }}>
          Administradoras:{" "}
          {(administradoras ?? []).map((a, i) => (
            <span key={a.id}>
              {i > 0 && ", "}
              <Link href={`/admin/usuarios/${a.id}`} className={styles.enlaceTexto}>
                {[a.nombre, a.apellidos].filter(Boolean).join(" ") || a.email}
              </Link>
            </span>
          ))}
        </p>
      )}
      <p style={{ margin: "0 0 12px" }}>
        {verArchivadas ? (
          <Link href="/admin/usuarios" className={styles.enlaceBarra}>
            ← Volver a las personas activas
          </Link>
        ) : (
          hayArchivadas && (
            <Link href="/admin/usuarios?archivadas=1" className={styles.enlaceBarra}>
              Ver personas archivadas
            </Link>
          )
        )}
      </p>
      <ListaUsuarios usuarios={usuarios} />
    </main>
  );
}
