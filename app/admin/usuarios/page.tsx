import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaUsuarios, { type Usuario } from "./ListaUsuarios";
import { formasActivas } from "@/lib/formasPago";
import NuevoUsuario, { type TarifaOpcion } from "./NuevoUsuario";

export const metadata = { title: "Usuarios · Administración" };

type Fila = Omit<Usuario, "foto" | "tarifas"> & { foto_path: string | null };

export default async function Usuarios() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase.rpc("resumen_usuarios");
  const filas = (data ?? []) as Fila[];

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = filas.map((f) => f.foto_path).filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };

  // Tarifa (bono) activa de cada persona, para filtrar y mostrar.
  const { data: bonosActivos } = await createAdminClient()
    .from("bonos")
    .select("user_id, tipos_bono(nombre)")
    .eq("estado", "activo");
  const tarifasDe = new Map<string, string[]>();
  for (const b of (bonosActivos ?? []) as unknown as { user_id: string; tipos_bono: { nombre: string } | null }[]) {
    if (!b.tipos_bono) continue;
    tarifasDe.set(b.user_id, [...(tarifasDe.get(b.user_id) ?? []), b.tipos_bono.nombre]);
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
      <NuevoUsuario tarifas={tarifas} formas={await formasActivas()} />
      <ListaUsuarios usuarios={usuarios} />
    </main>
  );
}
