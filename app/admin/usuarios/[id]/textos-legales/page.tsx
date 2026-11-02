import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../../admin.module.css";
import ListaTextosLegales, { type Aceptacion } from "./ListaTextosLegales";
import CabeceraAdmin from "../../../CabeceraAdmin";

export const metadata = { title: "Textos legales aceptados · Administración" };

const TITULOS: Record<string, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  imagen: "Uso de la imagen (fotos y vídeos)",
  "aviso-legal": "Aviso legal",
  cookies: "Política de cookies",
};

export default async function TextosLegalesPersona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();

  const [{ data: p }, { data: aceptadasDatos }, { data: textosDatos }] = await Promise.all([
    admin.from("profiles").select("nombre, apellidos, email, rol").eq("id", id).maybeSingle(),
    admin.from("consentimientos").select("tipo, version, aceptado_en, concedido").eq("user_id", id).order("aceptado_en", { ascending: false }),
    admin.from("textos_legales").select("documento, version"),
  ]);
  if (!p || p.rol === "admin") notFound();
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";

  const texto = new Map(((textosDatos ?? []) as { documento: string; version: string }[]).map((t) => [`${t.documento}|${t.version}`, true]));
  const aceptaciones: Aceptacion[] = ((aceptadasDatos ?? []) as { tipo: string; version: string; aceptado_en: string; concedido: boolean | null }[]).map((a) => ({
    clave: `${a.tipo}|${a.version}|${a.aceptado_en}`,
    tipo: a.tipo,
    titulo: TITULOS[a.tipo] ?? a.tipo,
    version: a.version,
    aceptadoEn: a.aceptado_en,
    noAutorizo: a.tipo === "imagen" && a.concedido === false,
    hayTexto: texto.has(`${a.tipo}|${a.version}`),
  }));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Textos legales</h1>
        <Link href={`/admin/usuarios/${id}?pestana=perfil`} className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <strong style={{ fontSize: "1.1rem" }}>{nombre}</strong>
        <div className={styles.ayuda}>{p.email}</div>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Los textos que ha aceptado desde que se dio de alta, con la versión exacta, el día y la hora. Cada uno se puede descargar en PDF.
        </p>
      </section>

      <ListaTextosLegales userId={id} aceptaciones={aceptaciones} />
    </main>
  );
}
