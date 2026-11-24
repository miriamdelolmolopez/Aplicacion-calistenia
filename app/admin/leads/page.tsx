import { requireLeads } from "./acceso";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import { catalogosDe, estadosDe } from "./datos";
import ListaLeads from "./ListaLeads";
import { COLUMNAS_LEAD, type Lead } from "./tipos";

export const metadata = { title: "Leads · Administración" };

export default async function Leads() {
  const { supabase, duenoId } = await requireLeads();
  const [estados, { etiquetas, tipos }] = await Promise.all([estadosDe(duenoId), catalogosDe(duenoId)]);
  // Solo salen los leads de este entrenador (además, la base de datos lo exige).
  const { data } = await supabase.from("leads").select(COLUMNAS_LEAD).eq("entrenador_id", duenoId).order("llegada_en", { ascending: false }).limit(2000);

  return (
    <main className={styles.pagina} style={{ maxWidth: "none" }}>
      <CabeceraAdmin>
        <h1>Leads</h1>
      </CabeceraAdmin>
      <ListaLeads leads={(data ?? []) as Lead[]} estados={estados} etiquetas={etiquetas} tipos={tipos} />
    </main>
  );
}
