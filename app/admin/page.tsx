import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import EditorPersona from "./EditorPersona";
import FormularioAlta from "./FormularioAlta";
import styles from "./admin.module.css";

export const metadata = { title: "Administración · Miriam del Olmo" };

const ROLES: Record<string, string> = {
  admin: "Administradora",
  alumno: "Alumno",
  invitado: "Invitado",
};

const SERVICIOS: Record<string, string> = {
  grupal: "Grupales",
  individual: "Individual",
  online: "Online",
};

type Fila = {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  telefono: string | null;
  rol: string;
  perfil_servicios: { servicio: string }[];
};

export default async function Administracion() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("profiles")
    .select("id, email, nombre, apellidos, telefono, rol, perfil_servicios(servicio)")
    .order("creado_en", { ascending: false });
  const personas = (data ?? []) as Fila[];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Administración</h1>
        <Link href="/cuenta" className={styles.enlaceBarra}>
          Mi cuenta
        </Link>
      </header>

      <nav className={styles.tarjeta}>
        <Link href="/admin/clases" className={styles.boton}>
          Clases y horario
        </Link>
        <Link href="/admin/bonos" className={styles.boton}>
          Bonos y pagos
        </Link>
        <Link href="/admin/ejercicios" className={styles.boton}>
          Biblioteca de ejercicios
        </Link>
      </nav>

      <FormularioAlta />

      <section className={styles.tarjeta}>
        <h2>Personas ({personas.length})</h2>
        {personas.length === 0 && <p className={styles.ayuda}>Todavía no hay nadie.</p>}
        <ul className={styles.lista}>
          {personas.map((p) => {
            const servicios = p.perfil_servicios.map((s) => s.servicio);
            const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ");
            return (
              <li key={p.id} className={styles.persona}>
                <div className={styles.personaCabecera}>
                  <div>
                    <strong>{nombre || "(sin nombre todavía)"}</strong>
                    <div className={styles.ayuda}>{p.email}</div>
                    {p.telefono && <div className={styles.ayuda}>{p.telefono}</div>}
                  </div>
                  <span className={styles.etiqueta}>{ROLES[p.rol] ?? p.rol}</span>
                </div>
                {servicios.length > 0 && (
                  <div className={styles.servicios}>
                    {servicios.map((s) => (
                      <span key={s} className={styles.etiquetaSuave}>
                        {SERVICIOS[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}
                {p.rol !== "admin" && (
                  <EditorPersona
                    persona={{
                      id: p.id,
                      email: p.email ?? "",
                      rol: p.rol,
                      servicios,
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
