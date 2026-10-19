import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";

export const metadata = { title: "Aprende · Administración" };

export default async function AdministrarAprende() {
  await requireAdmin();
  const admin = createAdminClient();
  const cuenta = async (tabla: string) => (await admin.from(tabla).select("id", { count: "exact", head: true })).count ?? 0;
  const [glosario, historia, preguntas] = await Promise.all([cuenta("glosario"), cuenta("historia"), cuenta("preguntas")]);

  const opciones = [
    { href: "/admin/aprende/glosario", titulo: "Glosario", ayuda: `${glosario} términos` },
    { href: "/admin/aprende/historia", titulo: "Historia", ayuda: `${historia} apartados` },
    { href: "/admin/aprende/preguntas", titulo: "Preguntas del examen", ayuda: `${preguntas} preguntas` },
  ];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Aprende</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>
      <p className={styles.aviso}>Aquí cambias lo que las alumnas ven en Más → Aprende.</p>
      <section className={styles.tarjeta}>
        {opciones.map((o) => (
          <Link key={o.href} href={o.href} className={styles.boton}>
            {o.titulo} · {o.ayuda}
          </Link>
        ))}
      </section>
    </main>
  );
}
