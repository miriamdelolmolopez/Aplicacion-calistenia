import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fondoFoto, type FotoNombre } from "@/lib/fotos";
import { marcarBorradoAtendido } from "./acciones";
import styles from "./admin.module.css";

export const metadata = { title: "Administración · Miriam del Olmo" };

type Azulejo = { href: string; titulo: string; foto: FotoNombre };

// Cada grupo es un título con sus fotos debajo. Las fotos son las de ejemplo de la app.
const GRUPOS: { titulo: string; azulejos: Azulejo[] }[] = [
  {
    titulo: "Personas y clases",
    azulejos: [
      { href: "/admin/usuarios", titulo: "Usuarios", foto: "calistenia" },
      { href: "/admin/personas", titulo: "Altas y roles", foto: "portada" },
      { href: "/admin/clases", titulo: "Clases", foto: "pino" },
      { href: "/admin/horario", titulo: "Horario", foto: "inicio" },
      { href: "/admin/horarios", titulo: "Plantillas", foto: "calistenia" },
    ],
  },
  {
    titulo: "Dinero",
    azulejos: [
      { href: "/admin/bonos", titulo: "Bonos y pagos", foto: "personal" },
      { href: "/admin/descuentos", titulo: "Descuentos", foto: "progreso" },
      { href: "/admin/exportar", titulo: "Descargar datos (CSV)", foto: "inicio" },
    ],
  },
  {
    titulo: "Entrenamiento online",
    azulejos: [
      { href: "/admin/ejercicios", titulo: "Ejercicios", foto: "calistenia" },
      { href: "/admin/rutinas", titulo: "Rutinas", foto: "online" },
    ],
  },
  {
    titulo: "Contenido y resumen",
    azulejos: [
      { href: "/admin/academia", titulo: "Academia", foto: "pino" },
      { href: "/admin/aprende", titulo: "Aprende", foto: "calistenia" },
      { href: "/admin/contenido", titulo: "Fotos y frases", foto: "inicio" },
      { href: "/admin/estadisticas", titulo: "Estadísticas", foto: "progreso" },
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

      {GRUPOS.map((g) => (
        <section key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className={styles.grupoTitulo}>{g.titulo}</h2>
          <div className={styles.cuadricula}>
            {g.azulejos.map((a) => (
              <Link key={a.href} href={a.href} className={styles.azulejo} style={{ backgroundImage: fondoFoto(a.foto) }}>
                <span>{a.titulo}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
