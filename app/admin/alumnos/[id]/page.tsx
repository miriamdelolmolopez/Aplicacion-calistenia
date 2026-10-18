import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import Medidas from "../../../perfil/Medidas";
import Progreso from "../../../progreso/Progreso";
import styles from "../../admin.module.css";

export const metadata = { title: "Progreso de la alumna · Miriam del Olmo" };

export default async function FichaAlumna({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: persona } = await supabase
    .from("profiles")
    .select("id, nombre, apellidos, email, rol")
    .eq("id", id)
    .maybeSingle();
  if (!persona || persona.rol === "admin") notFound();

  const nombre = [persona.nombre, persona.apellidos].filter(Boolean).join(" ") || persona.email;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>{nombre}</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>
      <Progreso userId={persona.id} admin />
      <h2 style={{ margin: "24px 0 8px" }}>Medidas</h2>
      <Medidas userId={persona.id} soloLectura />
    </main>
  );
}
