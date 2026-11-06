import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { esSuelto } from "@/lib/regalos";
import type { Regla } from "@/lib/reglasCatalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import CabeceraAdmin from "../../../CabeceraAdmin";
import styles from "../../../admin.module.css";
import EditorRegla from "./EditorRegla";

export const metadata = { title: "Automatización · Administración" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaRegla({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("automatizaciones");
  const { id } = await params;
  const admin = createAdminClient();

  let regla: Regla | null = null;
  if (id !== "nueva") {
    if (!UUID.test(id)) notFound();
    const { data } = await admin.from("reglas_automaticas").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    regla = data as Regla;
  }

  const { data: tipos } = await admin.from("tipos_bono").select("id, nombre").eq("activo", true).order("nombre");
  const tarifas = ((tipos ?? []) as { id: string; nombre: string }[]).filter((t) => !esSuelto(t.nombre));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>{regla ? "Editar automatización" : "Nueva automatización"}</h1>
        <Link href="/admin/automatizaciones" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <EditorRegla regla={regla} tarifas={tarifas} />
    </main>
  );
}
