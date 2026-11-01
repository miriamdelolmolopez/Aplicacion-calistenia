import { headers } from "next/headers";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { estadoLinkPrueba } from "@/lib/pruebaLink";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ControlesLink from "./Controles";

export const metadata = { title: "Link de prueba gratuita · Administración" };

export default async function LinkPrueba() {
  await requireAdmin();
  const admin = createAdminClient();
  const { activo, codigo } = await estadoLinkPrueba();

  // Dirección de la app tal y como la ve quien está mirando (así sirve en local y en producción).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = codigo ? `${protocolo}://${host}/prueba?c=${codigo}` : null;

  // Quién se ha registrado desde el link (queda anotado en su cuenta).
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const llegados = (lista?.users ?? []).filter((u) => u.user_metadata?.origen === "prueba");
  const ids = llegados.map((u) => u.id);
  const [{ data: perfiles }, { data: pruebas }] = ids.length
    ? await Promise.all([
        admin.from("profiles").select("id, nombre, apellidos, email, rol").in("id", ids),
        admin.from("reservas").select("user_id").in("user_id", ids).eq("es_prueba", true).in("estado", ["reservada", "cancelada_tarde"]),
      ])
    : [{ data: [] }, { data: [] }];
  const conPrueba = new Set(((pruebas ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const filas = llegados
    .map((u) => {
      const p = ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null; rol: string }[]).find((x) => x.id === u.id);
      return {
        id: u.id,
        nombre: [p?.nombre, p?.apellidos].filter(Boolean).join(" ") || p?.email || u.email || "(sin nombre)",
        alta: u.created_at,
        reservo: conPrueba.has(u.id),
        rol: p?.rol ?? "invitado",
      };
    })
    .sort((a, b) => b.alta.localeCompare(a.alta));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Link de prueba</h1>
        <Link href="/admin/presenciales" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Link de clase de prueba gratuita</h2>
        <p className={styles.ayuda}>
          Compártelo en Instagram o por WhatsApp. Quien lo abre ve una página de «Prueba una clase gratis» y crea su cuenta. Se registra como invitada: solo ve las plazas de
          prueba libres y puede hacer una clase. Con el registro cerrado (en Registro), este link es la única forma de que alguien nuevo cree cuenta.
        </p>
        <ControlesLink link={link} activo={activo} />
      </section>

      <section className={styles.tarjeta}>
        <h2>Han llegado por este link ({filas.length})</h2>
        {filas.length === 0 && <p className={styles.ayuda}>Todavía no se ha registrado nadie desde el link.</p>}
        <ul className={styles.lista}>
          {filas.map((f) => (
            <li key={f.id} className={styles.persona}>
              <div className={styles.personaCabecera}>
                <div>
                  <Link href={`/admin/usuarios/${f.id}`}>
                    <strong>{f.nombre}</strong>
                  </Link>
                  <div className={styles.ayuda}>Se registró el {fechaCorta(f.alta)}</div>
                </div>
                <span className={styles.etiquetaSuave}>{f.reservo ? "Ya reservó su clase de prueba" : f.rol === "invitado" ? "Aún no ha reservado" : "Ya es alumna"}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.ayuda}>Se cuentan las cuentas creadas desde el link, también las que entran con Google.</p>
      </section>
    </main>
  );
}
