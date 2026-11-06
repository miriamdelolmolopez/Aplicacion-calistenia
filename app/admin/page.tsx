import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardarAntelacionCumples, marcarBorradoAtendido } from "./acciones";
import styles from "./admin.module.css";
import { Cuadricula, type Azulejo } from "./Hub";
import CabeceraAdmin from "./CabeceraAdmin";
import { seccionesExcluidas } from "@/lib/admin";
import { sinExcluidas } from "@/lib/seccionesAdmin";

export const metadata = { title: "Administración · CalisCoach" };

// Cada grupo es un título con sus fotos debajo. Las fotos son las de ejemplo de la app.
const GRUPOS: { titulo?: string; azulejos: Azulejo[] }[] = [
  {
    azulejos: [
      { href: "/admin/usuarios", titulo: "Usuarios", foto: "calistenia" },
      { href: "/admin/registro", titulo: "Registro", foto: "pino" },
      { href: "/admin/importar", titulo: "Importar contactos", foto: "inicio" },
    ],
  },
  {
    titulo: "Servicios",
    azulejos: [
      { href: "/admin/presenciales", titulo: "Clases presenciales", foto: "pino" },
      { href: "/admin/online", titulo: "Entrenamientos online 1:1", foto: "online" },
      { href: "/admin/talleres", titulo: "Talleres", foto: "pino" },
      { href: "/admin/academia", titulo: "Cursos", foto: "pino" },
      { titulo: "Retos por semanas", foto: "progreso", proximamente: true },
      { titulo: "Membresía", foto: "personal", proximamente: true },
    ],
  },
  {
    titulo: "Economía",
    azulejos: [
      { href: "/admin/bonos", titulo: "Pagos", foto: "personal" },
      { href: "/admin/tarifas", titulo: "Servicios", foto: "calistenia" },
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
  const excluidas = await seccionesExcluidas();

  // Cumpleaños de hoy y de los próximos días (solo las personas que lo tienen activado en Ajustes).
  // Los días de antelación los elige la administradora.
  const admin = createAdminClient();
  const { data: ajusteCumple } = await admin.from("ajustes").select("valor").eq("clave", "cumple_aviso_dias").maybeSingle();
  const antelacion = Math.min(60, Math.max(0, Math.floor(Number(ajusteCumple?.valor ?? 0)) || 0));
  const { data: nacidos } = await admin
    .from("profiles")
    .select("id, nombre, apellidos, fecha_nacimiento")
    .eq("rol", "alumno")
    .eq("avisar_cumple", true)
    .not("fecha_nacimiento", "is", null);
  const hoyMadrid = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const [hy, hm, hd] = hoyMadrid.split("-").map(Number);
  const diaInicio = Date.UTC(hy, hm - 1, hd);
  const cumples = ((nacidos ?? []) as { id: string; nombre: string | null; apellidos: string | null; fecha_nacimiento: string }[])
    .map((n) => {
      const [, m, d] = n.fecha_nacimiento.split("-").map(Number);
      let prox = Date.UTC(hy, m - 1, d);
      // El 29 de febrero se celebra el 28 en los años que no son bisiestos.
      if (m === 2 && d === 29 && new Date(Date.UTC(hy, 1, 29)).getUTCMonth() !== 1) prox = Date.UTC(hy, 1, 28);
      if (prox < diaInicio) prox = Date.UTC(hy + 1, m - 1, d);
      const faltan = Math.round((prox - diaInicio) / 86_400_000);
      const fecha = new Date(prox);
      return { id: n.id, nombre: [n.nombre, n.apellidos].filter(Boolean).join(" ") || "Sin nombre", faltan, dia: fecha.getUTCDate(), mes: fecha.getUTCMonth() + 1 };
    })
    .filter((c) => c.faltan <= antelacion)
    .sort((a, b) => a.faltan - b.faltan || a.nombre.localeCompare(b.nombre, "es"));

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

      <section className={styles.tarjeta}>
        <h2>🎂 Cumpleaños</h2>
        {cumples.length === 0 ? (
          <p className={styles.ayuda} style={{ margin: 0 }}>
            {antelacion === 0 ? "Hoy no cumple años nadie." : `No cumple años nadie en los próximos ${antelacion} ${antelacion === 1 ? "día" : "días"}.`}
          </p>
        ) : (
          <ul className={styles.lista}>
            {cumples.map((c) => (
              <li key={c.id}>
                <strong>{c.nombre}</strong> ·{" "}
                {c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : `en ${c.faltan} días (${String(c.dia).padStart(2, "0")}/${String(c.mes).padStart(2, "0")})`}
              </li>
            ))}
          </ul>
        )}
        <form action={guardarAntelacionCumples} className={styles.personaCabecera}>
          <label htmlFor="cumple-dias">Avisarme con</label>
          <select key={antelacion} id="cumple-dias" name="dias" defaultValue={String(antelacion)}>
            {[0, 1, 2, 3, 5, 7, 10, 14, 21, 30].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "el mismo día" : `${n} ${n === 1 ? "día" : "días"} de antelación`}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.boton} style={{ whiteSpace: "nowrap" }}>
            Guardar
          </button>
        </form>
      </section>

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
