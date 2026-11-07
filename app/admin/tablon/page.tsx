import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import BotonesAnuncio from "./BotonesAnuncio";
import EditarAnuncio from "./EditarAnuncio";
import FormularioAnuncio from "./FormularioAnuncio";

export const metadata = { title: "Tablón de anuncios · Administración" };

type Fila = { id: string; titulo: string; texto: string; enlace: string | null; audiencia: string; fijado: boolean; publicado_en: string; caduca_en: string | null };

// Los anuncios que ven los alumnos en su pantalla de inicio y en «Tablón».
export default async function AdminTablon() {
  await requireAdmin("contenido");
  const { data } = await createAdminClient().from("anuncios").select("id, titulo, texto, enlace, audiencia, fijado, publicado_en, caduca_en").order("publicado_en", { ascending: false }).limit(200);
  const anuncios = (data ?? []) as Fila[];
  const ahora = new Date().getTime();

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Tablón de anuncios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Lo que publiques aquí lo ven los alumnos abajo del todo en su pantalla de inicio y en «Más → Tablón». Puedes elegir si lo ven solo los activos o todos, y si les avisas con una notificación (en la app y en el móvil) o por correo.
        </p>
      </section>

      <FormularioAnuncio />

      <section className={styles.tarjeta}>
        <h2>Publicados ({anuncios.length})</h2>
        {anuncios.length === 0 && <p className={styles.ayuda}>Todavía no hay ningún anuncio.</p>}
        <ul className={styles.lista}>
          {anuncios.map((a) => {
            const caducado = a.caduca_en !== null && new Date(a.caduca_en).getTime() < ahora;
            return (
              <li key={a.id} style={{ opacity: caducado ? 0.55 : 1 }}>
                <details>
                  <summary style={{ cursor: "pointer" }}>
                    <strong>{a.titulo}</strong>
                    {a.fijado ? " · fijado" : ""}
                    {caducado ? " · ya ha desaparecido" : ""}
                  </summary>
                  <p className={styles.ayuda}>
                    {a.audiencia === "todos" ? "Lo ven todos" : "Solo alumnos activos"} · publicado el {fechaCorta(a.publicado_en)}
                    {a.caduca_en && !caducado ? ` · desaparece el ${fechaCorta(a.caduca_en)}` : ""}
                  </p>
                  <EditarAnuncio
                    a={{
                      id: a.id,
                      titulo: a.titulo,
                      texto: a.texto,
                      enlace: a.enlace,
                      audiencia: a.audiencia,
                      fijado: a.fijado,
                      caduca: a.caduca_en ? claveDia(a.caduca_en) : "",
                    }}
                  />
                  <div style={{ marginTop: 10 }}>
                    <BotonesAnuncio id={a.id} fijado={a.fijado} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
