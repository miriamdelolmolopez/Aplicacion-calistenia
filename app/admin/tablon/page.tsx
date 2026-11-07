import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, fechaCorta } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import ApuntadosAnuncio from "./ApuntadosAnuncio";
import type { RespuestaAnuncio } from "./acciones";
import BotonesAnuncio from "./BotonesAnuncio";
import EditarAnuncio from "./EditarAnuncio";
import FormularioAnuncio from "./FormularioAnuncio";

export const metadata = { title: "Tablón de anuncios · Administración" };

type Fila = { id: string; titulo: string; texto: string; enlace: string | null; audiencia: string; fijado: boolean; publicado_en: string; caduca_en: string | null; admite_apuntados?: boolean; max_plazas?: number | null };

// Los anuncios que ven los alumnos en su pantalla de inicio y en «Tablón».
export default async function AdminTablon() {
  await requireAdmin("contenido");
  const admin = createAdminClient();
  const columnas = "id, titulo, texto, enlace, audiencia, fijado, publicado_en, caduca_en";
  // Si todavía no se ha ejecutado el SQL de «apuntarse», se leen los anuncios sin esas dos columnas.
  const completa = await admin.from("anuncios").select(`${columnas}, admite_apuntados, max_plazas`).order("publicado_en", { ascending: false }).limit(200);
  const conOpcion = !completa.error;
  const { data } = conOpcion ? completa : await admin.from("anuncios").select(columnas).order("publicado_en", { ascending: false }).limit(200);
  const anuncios = (data ?? []) as unknown as Fila[];

  // Quién ha contestado a cada anuncio.
  const respuestas = new Map<string, RespuestaAnuncio[]>();
  const ids = anuncios.filter((a) => a.admite_apuntados).map((a) => a.id);
  if (conOpcion && ids.length > 0) {
    const { data: rs } = await admin.from("anuncio_respuestas").select("anuncio_id, user_id, respuesta, creada_en, profiles(nombre, apellidos, email)").in("anuncio_id", ids).order("creada_en");
    for (const r of (rs ?? []) as unknown as { anuncio_id: string; user_id: string; respuesta: RespuestaAnuncio["respuesta"]; creada_en: string; profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null }[]) {
      const nombre = [r.profiles?.nombre, r.profiles?.apellidos].filter(Boolean).join(" ") || r.profiles?.email || "(sin nombre)";
      respuestas.set(r.anuncio_id, [...(respuestas.get(r.anuncio_id) ?? []), { userId: r.user_id, nombre, respuesta: r.respuesta, cuando: r.creada_en }]);
    }
  }
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
                    {a.audiencia === "todos" ? "Lo ven todos" : "Solo alumnos activos"}
                    {a.admite_apuntados ? " · se pueden apuntar" : ""} · publicado el {fechaCorta(a.publicado_en)}
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
                      admite: !!a.admite_apuntados,
                      maxPlazas: a.max_plazas ?? null,
                    }}
                    conOpcion={conOpcion}
                  />
                  {a.admite_apuntados && <ApuntadosAnuncio anuncioId={a.id} lista={respuestas.get(a.id) ?? []} maxPlazas={a.max_plazas ?? null} />}
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
