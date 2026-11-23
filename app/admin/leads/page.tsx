import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import { catalogosDe, estadosDe } from "./datos";
import ListaLeads from "./ListaLeads";
import { COLUMNAS_LEAD, type Lead } from "./tipos";

export const metadata = { title: "Leads · Administración" };

export default async function Leads() {
  const { supabase, user } = await requireAdmin("leads");
  const [estados, { etiquetas, tipos }] = await Promise.all([estadosDe(user.id), catalogosDe(user.id)]);
  // Solo salen los leads de este entrenador (además, la base de datos lo exige).
  const { data } = await supabase.from("leads").select(COLUMNAS_LEAD).eq("entrenador_id", user.id).order("llegada_en", { ascending: false }).limit(2000);

  return (
    <main className={styles.pagina} style={{ maxWidth: "none" }}>
      <CabeceraAdmin>
        <h1>Leads</h1>
      </CabeceraAdmin>
      <ListaLeads leads={(data ?? []) as Lead[]} estados={estados} etiquetas={etiquetas} tipos={tipos} />
    </main>
  );
}
