import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import Frases, { type Frase } from "../frases/Frases";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Frases · Administración" };

export default async function Contenido() {
  const { supabase } = await requireAdmin("contenido");

  const { data: frasesDatos } = await supabase
    .from("frases_inicio")
    .select("id, texto_es, texto_en, activa")
    .order("creada_en");

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Frases</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <Frases frases={(frasesDatos ?? []) as Frase[]} />
    </main>
  );
}
