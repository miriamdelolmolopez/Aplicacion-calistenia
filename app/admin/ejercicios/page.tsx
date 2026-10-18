import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIAS, MEDIDAS, nombreCategoria } from "@/lib/ejercicios";
import VideoEjercicio from "../../VideoEjercicio";
import styles from "../admin.module.css";
import { FormularioEjercicio, type EjercicioForm } from "./Controles";

export const metadata = { title: "Ejercicios · Administración" };

export default async function Ejercicios({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; archivados?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { cat, archivados } = await searchParams;
  const verArchivados = archivados === "1";

  const { data } = await supabase
    .from("ejercicios")
    .select(
      "id, nombre, nombre_en, categoria, medida, descripcion, descripcion_en, video_url, activo",
    )
    .order("nombre");
  const todos = (data ?? []) as EjercicioForm[];

  const visibles = todos.filter(
    (e) => (verArchivados || e.activo) && (!cat || e.categoria === cat),
  );
  const cuenta = (valor: string) =>
    todos.filter((e) => e.activo && e.categoria === valor).length;
  const archivadosTotal = todos.filter((e) => !e.activo).length;
  const sinVideo = todos.filter((e) => e.activo && !e.video_url).length;
  const sinExplicacion = todos.filter((e) => e.activo && !e.descripcion).length;

  const enlace = (nuevaCat: string | null, arch = verArchivados) => {
    const q = new URLSearchParams();
    if (nuevaCat) q.set("cat", nuevaCat);
    if (arch) q.set("archivados", "1");
    const texto = q.toString();
    return `/admin/ejercicios${texto ? `?${texto}` : ""}`;
  };

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Ejercicios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Tu biblioteca ({todos.filter((e) => e.activo).length})</h2>
        <p className={styles.ayuda}>
          Solo la ves tú. Más adelante, cada alumno verá los ejercicios de su rutina. Te faltan{" "}
          {sinVideo} vídeos y {sinExplicacion} explicaciones por completar.
        </p>
        <div className={styles.chips}>
          <Link
            href={enlace(null)}
            className={`${styles.chip} ${!cat ? styles.chipActivo : ""}`}
          >
            Todos
          </Link>
          {CATEGORIAS.map((c) => (
            <Link
              key={c.valor}
              href={enlace(c.valor)}
              className={`${styles.chip} ${cat === c.valor ? styles.chipActivo : ""}`}
            >
              {c.es} ({cuenta(c.valor)})
            </Link>
          ))}
        </div>
        {archivadosTotal > 0 && (
          <Link href={enlace(cat ?? null, !verArchivados)} className={styles.enlaceBarra}>
            {verArchivados ? "Ocultar archivados" : `Ver archivados (${archivadosTotal})`}
          </Link>
        )}
      </section>

      <FormularioEjercicio />

      <section className={styles.tarjeta}>
        <h2>{cat ? nombreCategoria(cat) : "Todos los ejercicios"} ({visibles.length})</h2>
        {visibles.length === 0 && <p className={styles.ayuda}>No hay ejercicios aquí.</p>}
        <ul className={styles.lista}>
          {visibles.map((e) => (
            <li key={e.id} className={styles.persona}>
              <div className={styles.personaCabecera}>
                <div>
                  <strong>{e.nombre}</strong>
                  {e.nombre_en && <div className={styles.ayuda}>{e.nombre_en}</div>}
                  <div className={styles.servicios}>
                    <span className={styles.etiquetaSuave}>{nombreCategoria(e.categoria)}</span>
                    <span className={styles.etiquetaSuave}>
                      {MEDIDAS.find((m) => m.valor === e.medida)?.es}
                    </span>
                    {!e.video_url && <span className={styles.etiquetaSuave}>Sin vídeo</span>}
                    {!e.descripcion && <span className={styles.etiquetaSuave}>Sin explicación</span>}
                    {!e.activo && <span className={styles.etiqueta}>Archivado</span>}
                  </div>
                </div>
              </div>
              <details className={styles.detalles}>
                <summary>Editar</summary>
                <VideoEjercicio url={e.video_url} titulo={e.nombre} />
                <FormularioEjercicio ejercicio={e} />
              </details>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
