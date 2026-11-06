import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import CabeceraAdmin from "../../CabeceraAdmin";
import AccionesPersona from "./AccionesPersona";
import FormularioPersona from "./FormularioPersona";
import { TEXTO_TIPO, TIPOS_PERSONA } from "./tipos";

export const metadata = { title: "Exalumnos e invitados antiguos · Administración" };

type Fila = { id: string; nombre: string | null; correo: string | null; dni: string | null; telefono: string | null; origen: string; tipos: string[] | null; tipo: string; bloquea_prueba: boolean; nota: string | null; creado_en: string };

// Personas que no tienen cuenta en la app: exalumnos e invitados antiguos. También entran solas las personas que reservan su clase de prueba.
export default async function Exalumnos({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireAdmin("usuarios");
  const { tipo: filtro } = await searchParams;
  const { data } = await createAdminClient()
    .from("personas_registradas")
    .select("id, nombre, correo, dni, telefono, origen, tipo, tipos, bloquea_prueba, nota, creado_en")
    .order("creado_en", { ascending: false })
    .limit(1000);
  const todas = (data ?? []) as Fila[];
  const tiposDe = (f: Fila) => (f.tipos && f.tipos.length > 0 ? f.tipos : [f.tipo]);
  const cuenta = (t: string) => todas.filter((f) => tiposDe(f).includes(t)).length;
  const filas = filtro && TEXTO_TIPO[filtro] ? todas.filter((f) => tiposDe(f).includes(filtro)) : todas;

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Exalumnos e invitados antiguos</h1>
        <Link href="/admin/usuarios" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Personas que ya no tienen cuenta o nunca la crearon. Cuando alguien se registra con el mismo correo, DNI o teléfono que una de estas personas y está marcada como «no puede hacer clase de prueba gratis», la app le dice que su cuenta ya consta y que lo confirme contigo. Las personas que reservan su clase de prueba entran aquí solas, y se quedan aunque se borre su cuenta.
        </p>
      </section>

      <FormularioPersona />

      <section className={styles.tarjeta}>
        <h2>Registro ({filas.length})</h2>
        <p style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", margin: "0 0 8px" }}>
          <Link href="/admin/usuarios/exalumnos" className={styles.enlaceBarra}>
            Todas ({todas.length})
          </Link>
          {TIPOS_PERSONA.map((t) => (
            <Link key={t.valor} href={`/admin/usuarios/exalumnos?tipo=${t.valor}`} className={styles.enlaceBarra}>
              {t.texto} ({cuenta(t.valor)})
            </Link>
          ))}
        </p>
        {filas.length === 0 && <p className={styles.ayuda}>Todavía no hay nadie aquí.</p>}
        <ul className={styles.lista}>
          {filas.map((f) => (
            <li key={f.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span>
                <strong>{f.nombre ?? "Sin nombre"}</strong> · {tiposDe(f).map((x) => TEXTO_TIPO[x] ?? x).join(" + ")}
                <br />
                <span className={styles.ayuda}>
                  {[f.correo, f.dni, f.telefono].filter(Boolean).join(" · ") || "—"} · {f.origen === "manual" ? "añadida a mano" : "reservó su clase de prueba"} · {fechaCorta(f.creado_en)}
                  {f.nota ? ` · ${f.nota}` : ""}
                  {f.bloquea_prueba ? " · sin clase de prueba gratis" : " · puede hacer su prueba"}
                </span>
              </span>
              <AccionesPersona id={f.id} bloquea={f.bloquea_prueba} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
