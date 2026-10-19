import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../Avatar";
import EditorPersona from "../EditorPersona";
import FormularioAlta from "../FormularioAlta";
import styles from "../admin.module.css";

export const metadata = { title: "Altas y roles · Administración" };

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
  foto_path: string | null;
  perfil_servicios: { servicio: string }[];
};

export default async function Personas() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("profiles")
    .select("id, email, nombre, apellidos, telefono, rol, foto_path, perfil_servicios(servicio)")
    .order("creado_en", { ascending: false });
  const personas = (data ?? []) as Fila[];

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = personas.map((p) => p.foto_path).filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };
  const fotoDe = (p: Fila) => firmadas?.find((f) => f.path === p.foto_path)?.signedUrl ?? null;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Altas y roles</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

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
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Avatar nombre={nombre || p.email || ""} url={fotoDe(p)} tamano={48} />
                    <div>
                      <strong>{nombre || "(sin nombre todavía)"}</strong>
                      <div className={styles.ayuda}>{p.email}</div>
                      {p.telefono && <div className={styles.ayuda}>{p.telefono}</div>}
                    </div>
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
                  <Link href={`/admin/usuarios/${p.id}`} className={styles.enlaceBarra}>
                    Ver ficha completa
                  </Link>
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
