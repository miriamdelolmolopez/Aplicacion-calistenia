import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIAS, nombreCategoria, nombreMusculo, nombreTipo } from "@/lib/ejercicios";
import VideoEjercicio from "../../VideoEjercicio";
import styles from "../admin.module.css";
import {
  FormularioEjercicio,
  FormularioMaterial,
  type EjercicioForm,
  type Material,
} from "./Controles";

export const metadata = { title: "Ejercicios · Administración" };

type Fila = Omit<EjercicioForm, "musculos" | "materiales"> & {
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { material_id: string }[];
};

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
      "id, nombre, nombre_en, categoria, tipo, descripcion, descripcion_en, video_url, activo, ejercicio_musculos(musculo, rol), ejercicio_materiales(material_id)",
    )
    .order("nombre");
  const todos: EjercicioForm[] = ((data ?? []) as unknown as Fila[]).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    nombre_en: e.nombre_en,
    categoria: e.categoria,
    tipo: e.tipo,
    descripcion: e.descripcion,
    descripcion_en: e.descripcion_en,
    video_url: e.video_url,
    activo: e.activo,
    musculos: e.ejercicio_musculos,
    materiales: e.ejercicio_materiales.map((m) => m.material_id),
  }));

  const { data: materialesDatos } = await supabase
    .from("materiales")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden")
    .order("nombre");
  const materiales = (materialesDatos ?? []) as Material[];
  const nombreMaterial = (id: string) => materiales.find((m) => m.id === id)?.nombre ?? "";

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
          {sinVideo} vídeos y {sinExplicacion} explicaciones por completar. Los músculos y el
          material de los ejercicios de partida son una sugerencia: revísalos.
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

      <FormularioEjercicio materiales={materiales} />

      <section className={styles.tarjeta}>
        <h2>{cat ? nombreCategoria(cat) : "Todos los ejercicios"} ({visibles.length})</h2>
        {visibles.length === 0 && <p className={styles.ayuda}>No hay ejercicios aquí.</p>}
        <ul className={styles.lista}>
          {visibles.map((e) => {
            const principales = e.musculos
              .filter((m) => m.rol === "principal")
              .map((m) => nombreMusculo(m.musculo));
            const secundarios = e.musculos
              .filter((m) => m.rol === "secundario")
              .map((m) => nombreMusculo(m.musculo));
            return (
              <li key={e.id} className={styles.persona}>
                <div className={styles.personaCabecera}>
                  <div>
                    <strong>{e.nombre}</strong>
                    {e.nombre_en && <div className={styles.ayuda}>{e.nombre_en}</div>}
                    <div className={styles.servicios}>
                      <span className={styles.etiquetaSuave}>{nombreCategoria(e.categoria)}</span>
                      <span className={styles.etiquetaSuave}>{nombreTipo(e.tipo)}</span>
                      {!e.video_url && <span className={styles.etiquetaSuave}>Sin vídeo</span>}
                      {!e.descripcion && <span className={styles.etiquetaSuave}>Sin explicación</span>}
                      {!e.activo && <span className={styles.etiqueta}>Archivado</span>}
                    </div>
                    <div className={styles.ayuda} style={{ marginTop: 6 }}>
                      <strong>Principales:</strong> {principales.join(", ") || "—"}
                      {secundarios.length > 0 && (
                        <>
                          {" "}
                          · <strong>Secundarios:</strong> {secundarios.join(", ")}
                        </>
                      )}
                    </div>
                    {e.materiales.length > 0 && (
                      <div className={styles.ayuda}>
                        <strong>Material:</strong> {e.materiales.map(nombreMaterial).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <details className={styles.detalles}>
                  <summary>Editar</summary>
                  <VideoEjercicio url={e.video_url} titulo={e.nombre} />
                  <FormularioEjercicio ejercicio={e} materiales={materiales} />
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <FormularioMaterial />
    </main>
  );
}
