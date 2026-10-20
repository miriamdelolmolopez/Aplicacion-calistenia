import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { marcarRegaloHecho } from "./acciones";
import { FormularioAutomatizacion, type Auto } from "./Controles";

export const metadata = { title: "Automatizaciones · Administración" };

const INFO: Record<string, { titulo: string; cuando: string; variables: string; orden: number }> = {
  prueba_recordatorio: {
    titulo: "Recordatorio de la clase de prueba",
    cuando: "Se envía el día antes de la clase de prueba de una persona nueva.",
    variables: "{nombre}, {clase}, {fecha}",
    orden: 1,
  },
  prueba_despues: {
    titulo: "Mensaje después de la clase de prueba",
    cuando: "Se envía al día siguiente de la clase de prueba (no se envía si la marcaste como «no asistió»).",
    variables: "{nombre}, {clase}, {fecha}",
    orden: 2,
  },
  bono_caduca: {
    titulo: "Aviso de bono a punto de caducar",
    cuando: "Se envía cuando a un bono activo le quedan los días indicados. Solo a quien tenga activados los avisos del bono.",
    variables: "{nombre}, {bono}, {fecha}, {clases}",
    orden: 3,
  },
  cumple: {
    titulo: "Cumpleaños y regalo",
    cuando:
      "Se envía el día del cumpleaños. Si tiene un bono de clases presenciales, se le suma 1 clase gratis. Si solo tiene plan online, se le regala una videollamada de 45 minutos (dudas o entrenamiento en directo) y a ti te llega un aviso para quedar con ella.",
    variables: "{nombre}, {regalo}",
    orden: 4,
  },
};

type Regalo = { id: string; creado_en: string; profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null };

export default async function Automatizaciones() {
  await requireAdmin();
  const supabase = createAdminClient();
  const [{ data }, { data: regalos }] = await Promise.all([
    supabase.from("automatizaciones").select("clave, activa, dias, asunto_es, mensaje_es, asunto_en, mensaje_en"),
    supabase
      .from("regalos")
      .select("id, creado_en, profiles(nombre, apellidos, email)")
      .eq("tipo", "videollamada")
      .eq("estado", "pendiente")
      .order("creado_en"),
  ]);
  const autos = ((data ?? []) as Auto[]).filter((a) => INFO[a.clave]).sort((a, b) => INFO[a.clave].orden - INFO[b.clave].orden);
  const pendientes = (regalos ?? []) as unknown as Regalo[];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Automatizaciones</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <p className={styles.ayuda}>
        Son correos y regalos que se envían solos. Se revisan una vez al día por la mañana. Cada persona recibe cada correo una sola vez, y las
        cuentas de prueba no reciben nada.
      </p>

      {pendientes.length > 0 && (
        <section className={styles.tarjeta}>
          <h2>Videollamadas de regalo pendientes ({pendientes.length})</h2>
          <p className={styles.ayuda}>Quedad el día por WhatsApp o por correo y márcala como hecha cuando la hayáis tenido.</p>
          {pendientes.map((r) => (
            <form key={r.id} action={marcarRegaloHecho} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <input type="hidden" name="id" value={r.id} />
              <span>{[r.profiles?.nombre, r.profiles?.apellidos].filter(Boolean).join(" ") || r.profiles?.email}</span>
              <button type="submit" className={`${styles.boton} ${styles.botonSecundario}`}>
                Marcar como hecha
              </button>
            </form>
          ))}
        </section>
      )}

      {autos.map((a) => (
        <FormularioAutomatizacion key={a.clave} auto={a} titulo={INFO[a.clave].titulo} cuando={INFO[a.clave].cuando} variables={INFO[a.clave].variables} />
      ))}
      {autos.length === 0 && <p className={styles.ayuda}>Todavía no están creadas. Falta ejecutar el archivo 039 en Supabase.</p>}
    </main>
  );
}
