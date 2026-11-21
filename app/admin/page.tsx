import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { marcarBorradoAtendido } from "./acciones";
import styles from "./admin.module.css";
import CabeceraAdmin from "./CabeceraAdmin";

export const metadata = { title: "Peticiones de borrado · CalisCoach" };

// Ya no hay pantalla «Panel»: Inicio tiene los datos y cada sección su menú. Esta dirección solo se usa para atender las peticiones de borrado de cuenta; sin ninguna, lleva a Inicio.
export default async function Administracion() {
  const { supabase } = await requireAdmin();

  const { data: peticiones } = await supabase
    .from("solicitudes_borrado")
    .select("id, creada_en, profiles(nombre, apellidos, email)")
    .eq("atendida", false)
    .order("creada_en");
  const pendientesBorrado = (peticiones ?? []) as unknown as {
    id: string;
    creada_en: string;
    profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null;
  }[];

  if (pendientesBorrado.length === 0) redirect("/inicio");

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Peticiones de borrado</h1>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <h2>Peticiones de borrado de cuenta ({pendientesBorrado.length})</h2>
        <p className={styles.ayuda}>Borra sus datos personales (los pagos se conservan) y marca la petición como atendida.</p>
        {pendientesBorrado.map((s) => (
          <form key={s.id} action={marcarBorradoAtendido} className={styles.personaCabecera}>
            <input type="hidden" name="id" value={s.id} />
            <div>
              <strong>{[s.profiles?.nombre, s.profiles?.apellidos].filter(Boolean).join(" ") || "(sin nombre)"}</strong>
              <div className={styles.ayuda}>{s.profiles?.email}</div>
            </div>
            <button type="submit" className={styles.boton}>
              Marcar como atendida
            </button>
          </form>
        ))}
      </section>
    </main>
  );
}
