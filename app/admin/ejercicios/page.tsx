import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIAS, nombreCategoria, nombreMusculo, nombreTipo } from "@/lib/ejercicios";
import VideoEjercicio from "../../VideoEjercicio";
import BotonFoto from "../fotos/BotonFoto";
import VideoRapido from "./VideoRapido";
import styles from "../admin.module.css";
import { FormularioEjercicio, type EjercicioForm, type Material } from "./Controles";
import FiltrosEjercicios from "./FiltrosEjercicios";
import GestionMaterial, { type MaterialFila } from "./GestionMaterial";

export const metadata = { title: "Ejercicios · Administración" };

type Fila = Omit<EjercicioForm, "musculos" | "materiales"> & {
  ejercicio_musculos: { musculo: string; rol: string }[];
  ejercicio_materiales: { material_id: string }[];
  foto_url: string | null;
};

type Vista = "biblioteca" | "crear" | "material";

export default async function Ejercicios({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    cat?: string;
    archivados?: string;
    q?: string;
    musculo?: string;
    material?: string;
    tipo?: string;
  }>;
}) {
  const { supabase } = await requireAdmin();
  const { vista: vistaPedida, cat, archivados, q, musculo, material, tipo } = await searchParams;
  const vista: Vista = vistaPedida === "crear" || vistaPedida === "material" ? vistaPedida : "biblioteca";
  const verArchivados = archivados === "1";

  const { data } = await supabase
    .from("ejercicios")
    .select(
      "id, nombre, nombre_en, categoria, tipo, descripcion, descripcion_en, video_url, foto_url, activo, ejercicio_musculos(musculo, rol), ejercicio_materiales(material_id)",
    )
    .order("nombre");
  const fotos = new Map(((data ?? []) as unknown as Fila[]).map((e) => [e.id, e.foto_url]));
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

  const { data: materialesTodos } = await supabase
    .from("materiales")
    .select("id, nombre, nombre_en, activo")
    .order("orden")
    .order("nombre");
  const filasMaterial: MaterialFila[] = (
    (materialesTodos ?? []) as { id: string; nombre: string; nombre_en: string | null; activo: boolean }[]
  ).map((m) => ({ ...m, usos: todos.filter((e) => e.materiales.includes(m.id)).length }));
  const materiales: Material[] = filasMaterial.filter((m) => m.activo).map((m) => ({ id: m.id, nombre: m.nombre }));
  const nombreMaterial = (id: string) => filasMaterial.find((m) => m.id === id)?.nombre ?? "";

  const busqueda = (q ?? "").trim().toLowerCase();
  const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visibles = todos.filter(
    (e) =>
      (verArchivados || e.activo) &&
      (!cat || e.categoria === cat) &&
      (!tipo || e.tipo === tipo) &&
      (!musculo || e.musculos.some((m) => m.musculo === musculo)) &&
      (!material || e.materiales.includes(material)) &&
      (!busqueda ||
        sinTildes(e.nombre).includes(sinTildes(busqueda)) ||
        sinTildes(e.nombre_en ?? "").includes(sinTildes(busqueda))),
  );
  const cuenta = (valor: string) => todos.filter((e) => e.activo && e.categoria === valor).length;
  const archivadosTotal = todos.filter((e) => !e.activo).length;
  const sinVideo = todos.filter((e) => e.activo && !e.video_url).length;
  const sinExplicacion = todos.filter((e) => e.activo && !e.descripcion).length;

  const enlace = (nuevaCat: string | null, arch = verArchivados) => {
    const p = new URLSearchParams();
    if (nuevaCat) p.set("cat", nuevaCat);
    if (arch) p.set("archivados", "1");
    if (busqueda) p.set("q", busqueda);
    if (musculo) p.set("musculo", musculo);
    if (material) p.set("material", material);
    if (tipo) p.set("tipo", tipo);
    const texto = p.toString();
    return `/admin/ejercicios${texto ? `?${texto}` : ""}`;
  };

  const pestana = (v: Vista, texto: string) => (
    <Link
      href={v === "biblioteca" ? "/admin/ejercicios" : `/admin/ejercicios?vista=${v}`}
      className={`${styles.chip} ${vista === v ? styles.chipActivo : ""}`}
    >
      {texto}
    </Link>
  );

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Ejercicios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <div className={styles.chips}>
        {pestana("biblioteca", `Biblioteca (${todos.filter((e) => e.activo).length})`)}
        {pestana("crear", "Crear ejercicio")}
        {pestana("material", `Material (${filasMaterial.length})`)}
      </div>

      {vista === "crear" && <FormularioEjercicio materiales={materiales} />}

      {vista === "material" && <GestionMaterial materiales={filasMaterial} />}

      {vista === "biblioteca" && (
        <>
          <section className={styles.tarjeta}>
            <h2>Tu biblioteca</h2>
            <p className={styles.ayuda}>
              Solo la ves tú. Más adelante, cada alumno verá los ejercicios de su rutina. Te faltan {sinVideo} vídeos
              y {sinExplicacion} explicaciones por completar. Los músculos y el material de los ejercicios de partida
              son una sugerencia: revísalos.
            </p>
            <FiltrosEjercicios
              inicial={{ q: q ?? "", musculo: musculo ?? "", material: material ?? "", tipo: tipo ?? "" }}
              cat={cat ?? ""}
              archivados={verArchivados}
              materiales={materiales}
            />
            <div className={styles.chips}>
              <Link href={enlace(null)} className={`${styles.chip} ${!cat ? styles.chipActivo : ""}`}>
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

          <section className={styles.tarjeta}>
            <h2>
              {cat ? nombreCategoria(cat) : "Todos los ejercicios"} ({visibles.length})
            </h2>
            {visibles.length === 0 && <p className={styles.ayuda}>No hay ejercicios aquí.</p>}
            <ul className={styles.lista}>
              {visibles.map((e) => {
                const principales = e.musculos.filter((m) => m.rol === "principal").map((m) => nombreMusculo(m.musculo));
                const secundarios = e.musculos.filter((m) => m.rol === "secundario").map((m) => nombreMusculo(m.musculo));
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
                    <VideoRapido id={e.id} nombre={e.nombre} actual={e.video_url} />
                    <details className={styles.detalles}>
                      <summary>Editar</summary>
                      <BotonFoto destino="ejercicio" id={e.id} actual={fotos.get(e.id) ?? null} />
                      <VideoEjercicio url={e.video_url} titulo={e.nombre} />
                      <FormularioEjercicio ejercicio={e} materiales={materiales} />
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
