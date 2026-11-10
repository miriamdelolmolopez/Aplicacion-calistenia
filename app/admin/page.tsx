import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { cumpleanosProximos } from "@/lib/cumpleanos";
import { textoCuando } from "@/lib/cumpleanosTexto";
import { guardarAntelacionCumples, guardarAvisoBonos, marcarBorradoAtendido } from "./acciones";
import { bonosPorCaducar, diasAvisoBonos } from "@/lib/bonosPorCaducar";
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
      { href: "/admin/tablon", titulo: "Tablón de anuncios", foto: "inicio" },
      { href: "/admin/aprende", titulo: "Aprende", foto: "calistenia" },
      { href: "/admin/exportar", titulo: "Descargar datos (CSV)", foto: "inicio" },
    ],
  },
];

export default async function Administracion() {
  const { supabase } = await requireAdmin();
  const excluidas = await seccionesExcluidas();

  // Cumpleaños de hoy y de los próximos días (con la antelación que elige la administradora).
  const { lista: cumples, antelacion } = await cumpleanosProximos();
  // Tarifas y bonos que se acaban pronto (con los días que elige la administradora).
  const diasBonos = await diasAvisoBonos();
  const porCaducar = await bonosPorCaducar(diasBonos);

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
                {textoCuando(c)}
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

      <section className={styles.tarjeta}>
        <h2>⏳ Tarifas a punto de caducar</h2>
        {porCaducar.length === 0 ? (
          <p className={styles.ayuda} style={{ margin: 0 }}>
            A nadie se le acaba la tarifa en los próximos {diasBonos} {diasBonos === 1 ? "día" : "días"}.
          </p>
        ) : (
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {porCaducar.length} {porCaducar.length === 1 ? "persona" : "personas"} en los próximos {diasBonos} {diasBonos === 1 ? "día" : "días"}
            </summary>
            <ul className={styles.lista} style={{ marginTop: 8 }}>
              {porCaducar.map((b, i) => (
                <li key={`${b.userId}-${i}`}>
                  <Link href={`/admin/usuarios/${b.userId}`}>
                    <strong>{b.nombre}</strong>
                  </Link>{" "}
                  · {b.tarifa} · caduca {b.cuando}
                </li>
              ))}
            </ul>
          </details>
        )}
        <form action={guardarAvisoBonos} className={styles.personaCabecera}>
          <label htmlFor="bonos-dias">Avisarme con</label>
          <select key={diasBonos} id="bonos-dias" name="dias" defaultValue={String(diasBonos)}>
            {[...new Set([1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, diasBonos])].sort((a, b) => a - b).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "día" : "días"} de antelación
              </option>
            ))}
          </select>
          <button type="submit" className={styles.boton} style={{ whiteSpace: "nowrap" }}>
            Guardar
          </button>
        </form>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Cada mañana te llega una notificación y un correo con esta lista (lo puedes quitar en Ajustes → Notificaciones).
        </p>
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
