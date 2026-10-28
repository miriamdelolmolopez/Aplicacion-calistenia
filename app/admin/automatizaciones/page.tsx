import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import { marcarRegaloHecho } from "./acciones";
import type { Auto } from "./Controles";
import ListaAutomatizaciones, { type Envios, type Info } from "./ListaAutomatizaciones";

export const metadata = { title: "Automatizaciones · Administración" };

const INFO: Record<string, Info & { orden: number }> = {
  prueba_recordatorio: {
    titulo: "Recordatorio de la clase de prueba",
    cuando: "El día antes de la clase de prueba. Cada mañana la app mira las clases de prueba de las próximas 30 horas y avisa; si la clase es muy temprano, el aviso sale el día anterior.",
    aQuien: "A la persona que ha reservado una clase de prueba (invitada).",
    queHace: "Le envía un correo con el nombre de la clase y el día y la hora, con un enlace a Clases. Solo se envía una vez por reserva.",
    variables: "{nombre}, {clase}, {fecha}",
    orden: 1,
  },
  prueba_despues: {
    titulo: "Mensaje después de la clase de prueba",
    cuando: "Al día siguiente de la clase de prueba: la app lo envía cuando han pasado al menos 3 horas desde la clase, en la revisión de la mañana.",
    aQuien: "A quien hizo la clase de prueba. No se envía si la marcaste como «no asistió».",
    queHace: "Le envía un correo de seguimiento con un enlace a las tarifas para que pueda apuntarse. Solo se envía una vez por reserva.",
    variables: "{nombre}, {clase}, {fecha}",
    orden: 2,
  },
  bono_caduca: {
    titulo: "Aviso de bono a punto de caducar",
    cuando: "Cada mañana la app mira los bonos activos. Avisa cuando a un bono le quedan los días de antelación que pongas abajo (o menos) para caducar.",
    aQuien: "A la alumna con ese bono, solo si tiene activados los avisos del bono en sus ajustes.",
    queHace: "Le envía un correo con el nombre del bono, la fecha en que caduca y las clases que le quedan, con un enlace a su cuenta. Solo se envía una vez por bono.",
    variables: "{nombre}, {bono}, {fecha}, {clases}",
    orden: 3,
  },
  cumple: {
    titulo: "Cumpleaños y regalo",
    cuando: "El día del cumpleaños de cada persona (según la fecha de nacimiento de su perfil), en la revisión de la mañana. Una vez al año.",
    aQuien: "A alumnas e invitadas que tengan puesta su fecha de nacimiento.",
    queHace:
      "Le envía un correo de felicitación. Si tiene un bono de clases presenciales, le suma 1 clase gratis. Si solo tiene plan online, le regala una videollamada de 45 minutos (dudas o entrenamiento en directo) y a ti te llega un aviso para quedar con ella.",
    variables: "{nombre}, {regalo}",
    orden: 4,
  },
};

type Regalo = { id: string; creado_en: string; profiles: { nombre: string | null; apellidos: string | null; email: string | null } | null };

export default async function Automatizaciones() {
  await requireAdmin();
  const supabase = createAdminClient();
  const [{ data }, { data: regalos }, { data: enviadosDatos }] = await Promise.all([
    supabase.from("automatizaciones").select("clave, activa, dias, asunto_es, mensaje_es, asunto_en, mensaje_en"),
    supabase
      .from("regalos")
      .select("id, creado_en, profiles(nombre, apellidos, email)")
      .eq("tipo", "videollamada")
      .eq("estado", "pendiente")
      .order("creado_en"),
    supabase.from("avisos_enviados").select("tipo, enviado_en").in("tipo", Object.keys(INFO)),
  ]);
  const envios: Record<string, Envios> = {};
  for (const e of (enviadosDatos ?? []) as { tipo: string; enviado_en: string }[]) {
    const actual = envios[e.tipo] ?? { total: 0, ultimo: null };
    const dia = e.enviado_en.slice(0, 10);
    envios[e.tipo] = { total: actual.total + 1, ultimo: actual.ultimo && actual.ultimo > dia ? actual.ultimo : dia };
  }
  for (const k of Object.keys(envios)) {
    const u = envios[k].ultimo;
    if (u) envios[k].ultimo = `${u.slice(8, 10)}/${u.slice(5, 7)}/${u.slice(0, 4)}`;
  }
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
        Son correos y regalos que se envían solos. La app los revisa una vez al día, por la mañana (sobre las 7:00 u 8:00, hora de Madrid). Los correos salen en el idioma de cada persona. Cada persona recibe cada correo una sola vez, y las
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

      {autos.length > 0 && <ListaAutomatizaciones autos={autos} info={INFO} envios={envios} />}
      {autos.length === 0 && <p className={styles.ayuda}>Todavía no están creadas. Falta ejecutar el archivo 039 en Supabase.</p>}
    </main>
  );
}
