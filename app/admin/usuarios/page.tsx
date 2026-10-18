import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaUsuarios, { type Usuario } from "./ListaUsuarios";

export const metadata = { title: "Usuarios · Administración" };

type Fila = Omit<Usuario, "foto"> & { foto_path: string | null };

export default async function Usuarios() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase.rpc("resumen_usuarios");
  const filas = (data ?? []) as Fila[];

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = filas.map((f) => f.foto_path).filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };

  const usuarios: Usuario[] = filas.map(({ foto_path, ...resto }) => ({
    ...resto,
    foto: foto_path ? (firmadas?.find((f) => f.path === foto_path)?.signedUrl ?? null) : null,
  }));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Usuarios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>
      <ListaUsuarios usuarios={usuarios} />
    </main>
  );
}
