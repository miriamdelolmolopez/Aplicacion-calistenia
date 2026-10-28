import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { marcarBorradoAtendido } from "./acciones";
import styles from "./admin.module.css";
import { Cuadricula, type Azulejo } from "./Hub";

export const metadata = { title: "Administración · CalisCoach" };

// Cada grupo es un título con sus fotos debajo. Las fotos son las de ejemplo de la app.
const GRUPOS: { titulo?: string; azulejos: Azulejo[] }[] = [
  {
    azulejos: [{ href: "/admin/usuarios", titulo: "Usuarios", foto: "calistenia" }],
  },
  {
    titulo: "Servicios",
    azulejos: [
      { href: "/admin/presenciales", titulo: "Clases presenciales", foto: "pino" },
      { href: "/admin/online", titulo: "Entrenamientos online 1:1", foto: "online" },
      { href: "/admin/academia", titulo: "Cursos", foto: "pino" },
      { titulo: "Retos por semanas", foto: "progreso", proximamente: true },
      { titulo: "Membresía", foto: "personal", proximamente: true },
    ],
  },
  {
    titulo: "Economía",
    azulejos: [
      { href: "/admin/bonos", titulo: "Pagos", foto: "personal" },
      { href: "/admin/tarifas", titulo: "Tarifas", foto: "calistenia" },
      { href: "/admin/descuentos", titulo: "Descuentos", foto: "progreso" },
      { href: "/admin/formas-pago", titulo: "Formas de pago", foto: "personal" },
      { titulo: "Contabilidad", foto: "progreso", proximamente: true },
    ],
  },
  {
    titulo: "Resumen y contenido",
    azulejos: [
      { href: "/admin/informes", titulo: "Informes", foto: "progreso" },
      { href: "/admin/legal", titulo: "Textos legales", foto: "personal" },
      { href: "/admin/automatizaciones", titulo: "Automatizaciones", foto: "online" },
      { href: "/admin/contenido", titulo: "Fotos y frases", foto: "inicio" },
      { href: "/admin/aprende", titulo: "Aprende", foto: "calistenia" },
      { href: "/admin/exportar", titulo: "Descargar datos (CSV)", foto: "inicio" },
    ],
  },
];

export default async function Administracion() {
  const { supabase } = await requireAdmin();

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

      {GRUPOS.map((g, i) => (
        <section key={g.titulo ?? i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {g.titulo && <h2 className={styles.grupoTitulo}>{g.titulo}</h2>}
          <Cuadricula azulejos={g.azulejos} />
        </section>
      ))}
    </main>
  );
}
