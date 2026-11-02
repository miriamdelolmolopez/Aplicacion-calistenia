import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import Importador from "./Importador";

export const metadata = { title: "Importar contactos · Administración" };

export default async function Importar() {
  await requireAdmin();
  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Importar contactos</h1>
        <Link href="/admin/usuarios" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <Importador />
    </main>
  );
}
