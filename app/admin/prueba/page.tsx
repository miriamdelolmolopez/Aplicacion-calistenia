import { headers } from "next/headers";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { estadoLinkPrueba } from "@/lib/pruebaLink";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ControlesLink from "./Controles";
import CabeceraAdmin from "../CabeceraAdmin";
import RegistroAntiguos from "../usuarios/exalumnos/RegistroAntiguos";
import SelectorEstado from "../usuarios/SelectorEstado";

export const metadata = { title: "Invitados · Administración" };

export default async function LinkPrueba({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const verAntiguos = vista === "antiguos";
  await requireAdmin("presenciales");
  const admin = createAdminClient();
  const { activo, codigo } = await estadoLinkPrueba();

  // Dirección de la app tal y como la ve quien está mirando (así sirve en local y en producción).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const link = codigo ? `${protocolo}://${host}/prueba?c=${codigo}` : null;

  // Quién se ha registrado desde el link (queda anotado en su cuenta).
  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  // Invitados: quienes llegaron por el link y cualquier persona con rol de invitado/a (por ejemplo, dada de alta a mano).
  const { data: invitadosPerfil } = await admin.from("profiles").select("id").eq("rol", "invitado");
  const idsInvitados = new Set(((invitadosPerfil ?? []) as { id: string }[]).map((p) => p.id));
  const llegados = (lista?.users ?? []).filter((u) => u.user_metadata?.origen === "prueba" || idsInvitados.has(u.id));
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
        rol: p?.rol ?? "invitado/a",
      };
    })
    .sort((a, b) => b.alta.localeCompare(a.alta));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Invitados</h1>
        <Link href="/inicio" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <SelectorEstado base="/admin/prueba" vista={verAntiguos ? "antiguos" : "actuales"} />
      {verAntiguos ? (
        <RegistroAntiguos grupo="invitados" />
      ) : (
        <>
      <section className={styles.tarjeta}>
        <h2>Link de prueba</h2>
        <p className={styles.ayuda}>
          Compártelo en Instagram o por WhatsApp. Quien lo abre ve una página de «Prueba una clase gratis» y crea su cuenta. Se registra como invitado/a: solo ve las plazas de
          prueba libres y puede hacer una clase. Con el registro cerrado (en Registro), este link es la única forma de que alguien nuevo cree cuenta.
        </p>
        <ControlesLink link={link} activo={activo} />
      </section>

      <section className={styles.tarjeta}>
        <h2>Invitados/as ({filas.length})</h2>
        {filas.length === 0 && <p className={styles.ayuda}>Todavía no hay invitados/as.</p>}
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
                <span className={styles.etiquetaSuave}>{f.reservo ? "Ya reservó su clase de prueba" : f.rol === "invitado" ? "Aún no ha reservado" : "Ya es alumno/a"}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.ayuda}>Se cuentan las cuentas creadas desde el link, también las que entran con Google.</p>
      </section>
        </>
      )}
    </main>
  );
}
