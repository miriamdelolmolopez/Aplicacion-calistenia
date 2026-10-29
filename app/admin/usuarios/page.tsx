import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaUsuarios, { type Usuario } from "./ListaUsuarios";
import { formasActivas } from "@/lib/formasPago";
import NuevoUsuario, { type TarifaOpcion } from "./NuevoUsuario";

export const metadata = { title: "Usuarios · Administración" };

type Fila = Omit<Usuario, "foto" | "tarifas" | "tarifa_desde" | "tarifa_hasta" | "pendiente_cobro"> & { foto_path: string | null };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const { supabase } = await requireAdmin();

  const { data } = await supabase.rpc("resumen_usuarios");
  const filas = (data ?? []) as Fila[];

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

  const { data: tarifasDatos } = await createAdminClient()
    .from("tipos_bono")
    .select("id, nombre, servicio, precio_centimos")
    .eq("activo", true)
    .order("servicio")
    .order("precio_centimos");
  const tarifas = (tarifasDatos ?? []) as TarifaOpcion[];

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
      <header className={styles.barra}>
        <h1>Usuarios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>
      <NuevoUsuario tarifas={tarifas} formas={await formasActivas()} abiertoInicial={nuevo === "1"} />
      <ListaUsuarios usuarios={usuarios} />
    </main>
  );
}
