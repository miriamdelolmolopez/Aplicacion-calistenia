import "server-only";
import { createHash } from "node:crypto";
import { enviarCorreo } from "./email";
import { enviable, HORA, personas, protegido, reclamar, soltar, type Persona, type TipoAviso } from "./avisos";
import { correoAutomatico, fechaHora, soloFecha } from "./plantillas-email";
import { createAdminClient } from "./supabase/admin";

// Automatizaciones: avisos y regalos que se revisan una vez al día (los lanza el cron).
// Cada una se puede apagar y sus textos se editan en Administración → Automatizaciones.

export type ClaveAutomatizacion = "prueba_recordatorio" | "prueba_despues" | "bono_caduca" | "cumple";

export type Automatizacion = {
  clave: ClaveAutomatizacion;
  activa: boolean;
  dias: number;
  asunto_es: string;
  mensaje_es: string;
  asunto_en: string;
  mensaje_en: string;
};

async function cargar(clave: ClaveAutomatizacion): Promise<Automatizacion | null> {
  const { data } = await createAdminClient().from("automatizaciones").select("*").eq("clave", clave).maybeSingle();
  const a = data as Automatizacion | null;
  return a && a.activa ? a : null;
}

function correo(a: Automatizacion, p: Persona & { email: string }, valores: Record<string, string>, ruta: string) {
  const en = p.idioma === "en";
  return correoAutomatico({
    para: p.email,
    idioma: p.idioma,
    asunto: en ? a.asunto_en : a.asunto_es,
    mensaje: en ? a.mensaje_en : a.mensaje_es,
    valores: { nombre: p.nombre ?? "", ...valores },
    ruta,
  });
}

type ReservaPrueba = {
  id: string;
  user_id: string;
  asistencia: string | null;
  sesiones_clase: { empieza_en: string; estado: string; tipos_clase: { nombre: string } | null } | null;
};

async function reservasDePrueba(): Promise<ReservaPrueba[]> {
  const { data } = await createAdminClient()
    .from("reservas")
    .select("id, user_id, asistencia, sesiones_clase(empieza_en, estado, tipos_clase(nombre))")
    .eq("es_prueba", true)
    .eq("estado", "reservada");
  return ((data ?? []) as unknown as ReservaPrueba[]).filter((r) => r.sesiones_clase?.estado === "programada");
}

// Un correo para cada reserva de prueba que cumple «cuando». Devuelve cuántos se enviaron.
async function enviarPrueba(tipo: "prueba_recordatorio" | "prueba_despues", cuando: (empieza: number, ahora: number, dias: number) => boolean): Promise<number> {
  let enviados = 0;
  await protegido(tipo, async () => {
    const a = await cargar(tipo);
    if (!a) return;
    const ahora = Date.now();
    const reservas = (await reservasDePrueba()).filter(
      (r) => cuando(new Date(r.sesiones_clase!.empieza_en).getTime(), ahora, a.dias) && !(tipo === "prueba_despues" && r.asistencia === "no_asistio"),
    );
    const porId = new Map((await personas(reservas.map((r) => r.user_id))).map((p) => [p.id, p]));
    for (const r of reservas) {
      const p = porId.get(r.user_id);
      if (!p || !enviable(p.email)) continue;
      if (!(await reclamar(tipo, r.id, p.id))) continue;
      const s = r.sesiones_clase!;
      const ok = await enviarCorreo(
        correo(a, p as Persona & { email: string }, { clase: s.tipos_clase?.nombre ?? "Clase", fecha: fechaHora(s.empieza_en, p.idioma) }, tipo === "prueba_despues" ? "/tarifas" : "/clases"),
      );
      if (ok) enviados++;
      else await soltar(tipo, r.id, p.id);
    }
  });
  return enviados;
}

// El día antes (o antes si la clase es muy temprano).
export const recordatorioPrueba = () => enviarPrueba("prueba_recordatorio", (e, ahora, dias) => e > ahora && e <= ahora + (dias * 24 + 6) * HORA);

// Al día siguiente de la clase de prueba (pasadas al menos 3 horas).
export const mensajeTrasPrueba = () => enviarPrueba("prueba_despues", (e, ahora, dias) => e <= ahora - 3 * HORA && e > ahora - (dias * 24 + 18) * HORA);

// Bono que caduca en los próximos N días (por defecto 7). Respeta la preferencia «avisos del bono».
export async function bonoPorCaducar(): Promise<number> {
  let enviados = 0;
  await protegido("bono por caducar", async () => {
    const a = await cargar("bono_caduca");
    if (!a) return;
    const ahora = Date.now();
    const { data } = await createAdminClient()
      .from("bonos")
      .select("id, user_id, servicio, clases_restantes, caduca_en, tipos_bono(nombre)")
      .eq("estado", "activo")
      .gt("caduca_en", new Date(ahora).toISOString())
      .lte("caduca_en", new Date(ahora + a.dias * 24 * HORA).toISOString());
    const bonos = (data ?? []) as unknown as {
      id: string;
      user_id: string;
      servicio: string;
      clases_restantes: number;
      caduca_en: string;
      tipos_bono: { nombre: string } | null;
    }[];
    const porId = new Map((await personas(bonos.map((b) => b.user_id))).map((p) => [p.id, p]));

    for (const b of bonos) {
      const p = porId.get(b.user_id);
      if (!p || !enviable(p.email) || !p.avisos_bono) continue;
      if (!(await reclamar("bono_caduca", b.id, p.id))) continue;
      const n = b.clases_restantes;
      const en = p.idioma === "en";
      const clases =
        b.servicio === "online" ? "" : en ? `You have ${n} ${n === 1 ? "class" : "classes"} left.` : `Te quedan ${n} ${n === 1 ? "clase" : "clases"}.`;
      const ok = await enviarCorreo(
        correo(a, p as Persona & { email: string }, { bono: b.tipos_bono?.nombre ?? (en ? "pass" : "bono"), fecha: soloFecha(b.caduca_en, p.idioma), clases }, "/cuenta"),
      );
      if (ok) enviados++;
      else await soltar("bono_caduca", b.id, p.id);
    }
  });
  return enviados;
}

// ---- Cumpleaños ---------------------------------------------------------------------------

function hoyMadrid(): { mes: number; dia: number; anio: number } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const v = (t: string) => Number(f.find((p) => p.type === t)?.value);
  return { mes: v("month"), dia: v("day"), anio: v("year") };
}

// Un identificador fijo por persona y año, para no felicitar ni regalar dos veces en el mismo año.
function refCumple(userId: string, anio: number): string {
  const h = createHash("md5").update(`${userId}:${anio}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const REGALO = {
  clase: {
    es: "Mi regalo para ti: una clase gratis. Ya la tienes sumada a tu bono, resérvala cuando quieras.",
    en: "My gift to you: a free class. It's already added to your pass, book it whenever you like.",
  },
  videollamada: {
    es: "Mi regalo para ti: una videollamada de 45 minutos, para resolver tus dudas o para entrenar juntas en directo. Respóndeme a este correo y buscamos el día.",
    en: "My gift to you: a 45-minute video call, to answer your questions or to train together live. Reply to this email and we'll find a day.",
  },
  ninguno: { es: "Que pases un día estupenda.", en: "Have a wonderful day." },
};

export async function felicitarCumpleanos(): Promise<number> {
  let enviados = 0;
  await protegido("cumpleaños", async () => {
    const a = await cargar("cumple");
    if (!a) return;
    const admin = createAdminClient();
    const hoy = hoyMadrid();
    const bisiesto = (hoy.anio % 4 === 0 && hoy.anio % 100 !== 0) || hoy.anio % 400 === 0;

    const { data } = await admin.from("profiles").select("id, fecha_nacimiento").in("rol", ["alumno", "invitado"]).not("fecha_nacimiento", "is", null);
    const cumplen = ((data ?? []) as { id: string; fecha_nacimiento: string }[]).filter((x) => {
      const [, m, d] = x.fecha_nacimiento.split("-").map(Number);
      return (m === hoy.mes && d === hoy.dia) || (!bisiesto && m === 2 && d === 29 && hoy.mes === 2 && hoy.dia === 28);
    });
    const lista = await personas(cumplen.map((c) => c.id));
    const { data: admins } = await admin.from("profiles").select("id, email, nombre, idioma, avisos_reserva, avisos_bono").eq("rol", "admin");

    for (const p of lista) {
      if (!enviable(p.email)) continue;
      const ref = refCumple(p.id, hoy.anio);
      if (!(await reclamar("cumple" satisfies TipoAviso, ref, p.id))) continue;

      // Regalo: clase gratis si tiene un bono de clases presenciales; videollamada si es online.
      const { data: bonos } = await admin.from("bonos").select("id, servicio").eq("user_id", p.id).eq("estado", "activo");
      const activos = (bonos ?? []) as { id: string; servicio: string }[];
      const presencial = activos.find((b) => b.servicio !== "online");
      let regalo: "clase" | "videollamada" | "ninguno" = "ninguno";
      if (presencial) {
        const { error } = await admin.rpc("ajustar_bono", { p_bono: presencial.id, p_clases: 1, p_dias: 0, p_nota: "Regalo de cumpleaños", p_admin: null });
        if (!error) {
          regalo = "clase";
          await admin.from("regalos").insert({ user_id: p.id, tipo: "clase", estado: "hecho" });
        }
      } else if (activos.length > 0) {
        const { error } = await admin.from("regalos").insert({ user_id: p.id, tipo: "videollamada" });
        if (!error) regalo = "videollamada";
      }

      const ok = await enviarCorreo(correo(a, p as Persona & { email: string }, { regalo: REGALO[regalo][p.idioma] }, "/inicio"));
      if (ok) enviados++;

      if (regalo === "videollamada") {
        const nombre = [p.nombre].filter(Boolean).join(" ") || p.email;
        for (const ad of (admins ?? []) as Persona[]) {
          if (!enviable(ad.email)) continue;
          await enviarCorreo(
            correoAutomatico({
              para: ad.email,
              idioma: "es",
              asunto: "Videollamada de cumpleaños pendiente",
              mensaje: `${nombre} cumple años hoy y tiene de regalo una videollamada de 45 minutos (dudas o entrenamiento en directo).\n\nQuedad el día; después márcala como hecha en Automatizaciones.`,
              valores: {},
              ruta: "/admin/automatizaciones",
            }),
          );
        }
      }
    }
  });
  return enviados;
}
