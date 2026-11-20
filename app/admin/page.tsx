import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { marcarBorradoAtendido } from "./acciones";
import styles from "./admin.module.css";
import { Cuadricula, type Azulejo } from "./Hub";
import CabeceraAdmin from "./CabeceraAdmin";
import { seccionesExcluidas } from "@/lib/admin";
import { sinExcluidas } from "@/lib/seccionesAdmin";
import { GRUPOS_ADMIN } from "../gruposAdmin";

export const metadata = { title: "Administración · CalisCoach" };

// Cada grupo es un título con sus tarjetas debajo (los mismos grupos que el menú lateral, ver app/gruposAdmin.ts).
const GRUPOS: { titulo?: string; azulejos: Azulejo[] }[] = GRUPOS_ADMIN.map((g) => ({
  titulo: g.titulo,
  azulejos: g.opciones.map((o) => ({ href: o.href, titulo: o.texto, descripcion: o.descripcion, icono: o.icono, proximamente: o.proximamente })),
}));

export default async function Administracion() {
  const { supabase } = await requireAdmin();
  const excluidas = await seccionesExcluidas();

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

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Administración</h1>
        <Link href="/inicio" className={styles.enlaceBarra}>
          Inicio
        </Link>
      </CabeceraAdmin>

      {pendientesBorrado.length > 0 && (
        <section className={styles.tarjeta}>
          <h2>Peticiones de borrado de cuenta ({pendientesBorrado.length})</h2>
          <p className={styles.ayuda}>
            Borra sus datos personales (los pagos se conservan) y marca la petición como atendida.
          </p>
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
      )}

      {GRUPOS.map((g) => ({ ...g, azulejos: sinExcluidas(g.azulejos, excluidas) }))
        .filter((g) => g.azulejos.length > 0)
        .map((g, i) => (
        <section key={g.titulo ?? i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {g.titulo && <h2 className={styles.grupoTitulo}>{g.titulo}</h2>}
          <Cuadricula azulejos={g.azulejos} />
        </section>
      ))}
    </main>
  );
}
