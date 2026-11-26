import Link from "next/link";
import { requireLeads } from "../acceso";
import styles from "../../admin.module.css";
import CabeceraAdmin from "../../CabeceraAdmin";
import ConectarFormularios, { type Conexion } from "../ConectarFormularios";
import { catalogosDe } from "../datos";

export const metadata = { title: "Conexiones de formularios · Administración" };

// Pantalla donde se conectan y editan los formularios externos (Tally, etc.). Se llega desde el botón «Conectar formularios» de Leads.
export default async function Conexiones() {
  const { supabase, duenoId } = await requireLeads();
  const [{ data }, { etiquetas, tipos }] = await Promise.all([
    supabase.from("leads_conexiones").select("id, nombre, ultimos4, activo, recibidos, ultimo_uso, tipo_id, etiqueta_ids").eq("entrenador_id", duenoId).order("creado_en", { ascending: false }),
    catalogosDe(duenoId),
  ]);

  return (
    <main className={styles.pagina} style={{ maxWidth: 900, margin: "0 auto" }}>
      <CabeceraAdmin>
        <h1>Conexiones de formularios</h1>
        <Link href="/admin/leads" className={styles.enlaceBarra}>
          ← Volver a Leads
        </Link>
      </CabeceraAdmin>
      <ConectarFormularios conexiones={(data ?? []) as Conexion[]} tipos={tipos} etiquetas={etiquetas} />
    </main>
  );
}
