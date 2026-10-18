import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../Avatar";
import { marcarBorradoAtendido } from "./acciones";
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
  foto_path: string | null;
  perfil_servicios: { servicio: string }[];
};

export default async function Administracion() {
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

  // Cumpleaños de hoy (solo las personas que lo tienen activado en Ajustes).
  const { data: cumplesDatos } = await supabase.rpc("cumpleanos_hoy");
  const cumples = (cumplesDatos ?? []) as { id: string; nombre: string }[];

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
      <header className={styles.barra}>
        <h1>Administración</h1>
        <Link href="/inicio" className={styles.enlaceBarra}>
          Inicio
        </Link>
      </header>

      <nav className={styles.tarjeta}>
        <Link href="/admin/usuarios" className={styles.boton}>
          Usuarios
        </Link>
        <Link href="/admin/estadisticas" className={styles.boton}>
          Estadísticas e informes
        </Link>
        <Link href="/admin/clases" className={styles.boton}>
          Clases y horario
        </Link>
        <Link href="/admin/horarios" className={styles.boton}>
          Horarios (plantillas)
        </Link>
        <Link href="/admin/bonos" className={styles.boton}>
          Bonos y pagos
        </Link>
        <Link href="/admin/descuentos" className={styles.boton}>
          Descuentos
        </Link>
        <Link href="/admin/ejercicios" className={styles.boton}>
          Biblioteca de ejercicios
        </Link>
        <Link href="/admin/rutinas" className={styles.boton}>
          Rutinas de alumnos online
        </Link>
      </nav>

      {cumples.length > 0 && (
        <section className={styles.tarjeta}>
          <h2>🎂 Hoy cumplen años</h2>
          <p style={{ margin: 0 }}>{cumples.map((c) => c.nombre).join(" · ")}</p>
        </section>
      )}

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
