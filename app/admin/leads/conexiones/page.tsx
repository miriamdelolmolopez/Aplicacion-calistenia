import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../../admin.module.css";
import CabeceraAdmin from "../../CabeceraAdmin";
import ConectarFormularios, { type Conexion } from "../ConectarFormularios";

export const metadata = { title: "Conexiones de formularios · Administración" };

// Pantalla donde la administradora conecta sus formularios externos (Tally, etc.). Se llega desde el botón «Conectar formularios» de Leads.
export default async function Conexiones() {
  const { supabase, user } = await requireAdmin("leads");
  const { data } = await supabase.from("leads_conexiones").select("id, nombre, ultimos4, activo, recibidos, ultimo_uso").eq("entrenador_id", user.id).order("creado_en", { ascending: false });

  return (
    <main className={styles.pagina} style={{ maxWidth: 900, margin: "0 auto" }}>
      <CabeceraAdmin>
        <h1>Conexiones de formularios</h1>
        <Link href="/admin/leads" className={styles.enlaceBarra}>
          ← Volver a Leads
        </Link>
      </CabeceraAdmin>
      <ConectarFormularios conexiones={(data ?? []) as Conexion[]} />
    </main>
  );
}
