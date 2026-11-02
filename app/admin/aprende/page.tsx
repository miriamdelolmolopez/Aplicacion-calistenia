import Link from "next/link";
import VerComoAlumno from "../VerComoAlumno";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";

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
      <CabeceraAdmin>
        <h1>Aprende</h1>
        <VerComoAlumno destino="/aprende" />
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <p className={styles.aviso}>Aquí cambias lo que los/las alumnos/as ven en Más → Aprende.</p>
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
