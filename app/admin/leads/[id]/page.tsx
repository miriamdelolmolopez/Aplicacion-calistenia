import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLeads } from "../acceso";
import { formasActivas } from "@/lib/formasPago";
import styles from "../../admin.module.css";
import CabeceraAdmin from "../../CabeceraAdmin";
import { catalogosDe, estadosDe } from "../datos";
import FichaLead from "../FichaLead";
import { COLUMNAS_LEAD, type Lead, type NotaVenta, type TarifaLead } from "../tipos";

export const metadata = { title: "Lead · Administración" };

export default async function FichaDeLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, duenoId } = await requireLeads();
  const { data } = await supabase.from("leads").select(COLUMNAS_LEAD).eq("id", id).eq("entrenador_id", duenoId).maybeSingle();
  if (!data) notFound();
  const lead = data as Lead;
  const [estados, { etiquetas, tipos }, formas, { data: tarifas }, { data: notas }] = await Promise.all([
    estadosDe(duenoId),
    catalogosDe(duenoId),
    formasActivas(),
    supabase.from("tipos_bono").select("id, nombre, servicio, precio_centimos").eq("activo", true).not("nombre", "like", "Prueba gratuita · %").order("orden").order("precio_centimos"),
    supabase.from("leads_notas").select("id, texto, estado_nombre, autor, creado_en").eq("lead_id", id).eq("entrenador_id", duenoId).order("creado_en", { ascending: false }).limit(200),
  ]);

  return (
    <main className={styles.pagina} style={{ maxWidth: "none" }}>
      <CabeceraAdmin>
        <h1>{`${lead.nombre} ${lead.apellidos}`.trim()}</h1>
        <Link href="/admin/leads" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <FichaLead lead={lead} estados={estados} etiquetas={etiquetas} tipos={tipos} notas={(notas ?? []) as NotaVenta[]} tarifas={(tarifas ?? []) as TarifaLead[]} formas={formas} />
    </main>
  );
}
