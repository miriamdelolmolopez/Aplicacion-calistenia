import "server-only";
import { createHash } from "node:crypto";
import { enviarCorreo } from "./email";
import { administradoras, enviable, HORA, personas, protegido, reclamar, soltar, type Persona, type TipoAviso } from "./avisos";
import { correoAutomatico, fechaHora, soloFecha } from "./plantillas-email";
import { claveDia, sumarDias } from "./fechas";
import type { ClavePlantilla } from "./plantillasAutomatizacion";
import { PLANTILLAS } from "./plantillasAutomatizacion";
import { createAdminClient } from "./supabase/admin";

// Automatizaciones: avisos y regalos que se revisan una vez al día (los lanza el cron).
// Cada una se puede apagar y sus textos se editan en Administración → Automatizaciones.

export type ClaveAutomatizacion = "prueba_recordatorio" | "prueba_despues" | "bono_caduca" | "cumple" | ClavePlantilla;

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
    es: "Mi regalo para ti: una videollamada de 1 hora, para resolver tus dudas o para entrenar juntas en directo. Respóndeme a este correo y buscamos el día.",
    en: "My gift to you: a 1-hour video call, to answer your questions or to train together live. Reply to this email and we'll find a day.",
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
    const admins = await administradoras("admin_avisa_regalos");

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
        for (const ad of admins) {
          await enviarCorreo(
            correoAutomatico({
              para: ad.email,
              idioma: "es",
              asunto: "Videollamada de cumpleaños pendiente",
              mensaje: `${nombre} cumple años hoy y tiene de regalo una videollamada de 1 hora (dudas o entrenamiento en directo).\n\nQuedad el día; después márcala como hecha en Automatizaciones.`,
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

// ---- Plantillas nuevas: echamos de menos, bienvenida, recordatorio de clase, bono agotado y aniversario ----------

type Candidato = {
  persona: Persona & { email: string };
  ref: string;
  valores: Record<string, string>;
  ruta: string;
};

// Identificador fijo (con forma de uuid) a partir de unas partes, para no repetir un correo.
function refDe(...partes: string[]): string {
  const h = createHash("md5").update(partes.join(":")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// Desde cuándo está añadida una plantilla (para no avisar a gente de antes de que existiera).
async function desdeDe(clave: ClavePlantilla): Promise<number | null> {
  const { data } = await createAdminClient().from("ajustes").select("valor").eq("clave", `auto_desde_${clave}`).maybeSingle();
  const t = data?.valor ? Date.parse(data.valor) : NaN;
  return Number.isNaN(t) ? null : t;
}

const nombreVisible = (p: Persona) => p.nombre || p.email || "(sin nombre)";

// Las personas que cumplen la plantilla ahora mismo (sin contar a quien ya se le envió).
async function candidatos(clave: ClavePlantilla, dias: number): Promise<Candidato[]> {
  const admin = createAdminClient();
  const ahora = Date.now();
  const hoy = claveDia(new Date(ahora).toISOString());
  type Bruto = { userId: string; ref: string; valores: (p: Persona) => Record<string, string>; ruta: string; requiere?: "avisos_reserva" | "avisos_bono" | "avisos_recordatorio" | "avisos_novedades" };
  const brutos: Bruto[] = [];

  if (clave === "echamos_menos") {
    const { data: activos } = await admin.from("bonos").select("user_id, activo_desde").eq("estado", "activo");
    const ids = [...new Set(((activos ?? []) as { user_id: string }[]).map((b) => b.user_id))];
    if (ids.length > 0) {
      const [{ data: reservas }, { data: entrenos }] = await Promise.all([
        admin.from("reservas").select("user_id, asistencia, sesiones_clase!inner(empieza_en, estado)").in("user_id", ids).eq("estado", "reservada"),
        admin.from("entrenos").select("user_id, terminado_en").in("user_id", ids).eq("estado", "terminado"),
      ]);
      const ultima = new Map<string, number>();
      const futura = new Set<string>();
      for (const b of (activos ?? []) as { user_id: string; activo_desde: string | null }[]) {
        const t = b.activo_desde ? Date.parse(b.activo_desde) : NaN;
        if (!Number.isNaN(t) && t < (ultima.get(b.user_id) ?? Infinity) && !ultima.has(b.user_id)) ultima.set(b.user_id, t);
      }
      for (const r of (reservas ?? []) as unknown as { user_id: string; asistencia: string | null; sesiones_clase: { empieza_en: string; estado: string } }[]) {
        if (r.sesiones_clase.estado !== "programada") continue;
        const t = Date.parse(r.sesiones_clase.empieza_en);
        if (t > ahora) futura.add(r.user_id);
        else if (r.asistencia !== "no_asistio" && t > (ultima.get(r.user_id) ?? 0)) ultima.set(r.user_id, t);
      }
      for (const e of (entrenos ?? []) as { user_id: string; terminado_en: string | null }[]) {
        const t = e.terminado_en ? Date.parse(e.terminado_en) : NaN;
        if (!Number.isNaN(t) && t > (ultima.get(e.user_id) ?? 0)) ultima.set(e.user_id, t);
      }
      for (const id of ids) {
        const t = ultima.get(id);
        if (t === undefined || futura.has(id)) continue;
        const pasados = Math.floor((ahora - t) / (24 * HORA));
        if (pasados < dias || pasados > 120) continue;
        brutos.push({ userId: id, ref: refDe("menos", id, claveDia(new Date(t).toISOString())), valores: () => ({ dias: String(pasados) }), ruta: "/clases", requiere: "avisos_novedades" });
      }
    }
  }

  if (clave === "bienvenida") {
    const desde = await desdeDe("bienvenida");
    const limite = Math.max(desde ?? 0, ahora - 2 * 24 * HORA);
    const { data } = await admin.from("profiles").select("id").eq("rol", "alumno").gte("creado_en", new Date(limite).toISOString());
    for (const p of (data ?? []) as { id: string }[]) brutos.push({ userId: p.id, ref: refDe("bienvenida", p.id), valores: () => ({}), ruta: "/inicio" });
  }

  if (clave === "recordatorio_clase") {
    const manana = sumarDias(hoy, 1);
    const { data } = await admin
      .from("reservas")
      .select("id, user_id, sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre))")
      .eq("estado", "reservada")
      .eq("es_prueba", false)
      .gte("sesiones_clase.empieza_en", new Date(ahora).toISOString())
      .lte("sesiones_clase.empieza_en", new Date(ahora + 60 * HORA).toISOString());
    for (const r of (data ?? []) as unknown as { id: string; user_id: string; sesiones_clase: { empieza_en: string; estado: string; tipos_clase: { nombre: string } | null } }[]) {
      const s = r.sesiones_clase;
      if (s.estado !== "programada" || claveDia(s.empieza_en) !== manana) continue;
      brutos.push({
        userId: r.user_id,
        ref: r.id,
        valores: (p) => ({ clase: s.tipos_clase?.nombre ?? (p.idioma === "en" ? "your class" : "tu clase"), fecha: fechaHora(s.empieza_en, p.idioma) }),
        ruta: "/clases/mis-reservas",
        requiere: "avisos_recordatorio",
      });
    }
  }

  if (clave === "bono_agotado") {
    const { data: movs } = await admin.from("movimientos_bono").select("bono_id").eq("tipo", "agotado").gte("creado_en", new Date(ahora - 2 * 24 * HORA).toISOString());
    const bonoIds = [...new Set(((movs ?? []) as { bono_id: string }[]).map((m) => m.bono_id))];
    if (bonoIds.length > 0) {
      const { data: bonos } = await admin.from("bonos").select("id, user_id, estado, tipos_bono(nombre)").in("id", bonoIds).eq("estado", "agotado");
      for (const b of (bonos ?? []) as unknown as { id: string; user_id: string; tipos_bono: { nombre: string } | null }[]) {
        brutos.push({ userId: b.user_id, ref: b.id, valores: (p) => ({ bono: b.tipos_bono?.nombre ?? (p.idioma === "en" ? "pass" : "bono") }), ruta: "/tarifas", requiere: "avisos_bono" });
      }
    }
  }

  if (clave === "aniversario") {
    const [anio, mes, dia] = hoy.split("-").map(Number);
    const { data } = await admin.from("profiles").select("id, creado_en").eq("rol", "alumno");
    const cumplen = ((data ?? []) as { id: string; creado_en: string }[])
      .map((p) => ({ id: p.id, f: claveDia(p.creado_en).split("-").map(Number) }))
      .filter((p) => p.f[1] === mes && p.f[2] === dia && anio - p.f[0] >= 1);
    if (cumplen.length > 0) {
      const { data: bonos } = await admin.from("bonos").select("user_id").eq("estado", "activo").in("user_id", cumplen.map((c) => c.id));
      const conBono = new Set(((bonos ?? []) as { user_id: string }[]).map((b) => b.user_id));
      for (const c of cumplen) {
        if (!conBono.has(c.id)) continue;
        const n = anio - c.f[0];
        brutos.push({
          userId: c.id,
          ref: refDe("aniversario", c.id, String(anio)),
          valores: (p) => ({ tiempo: p.idioma === "en" ? `${n} ${n === 1 ? "year" : "years"}` : `${n} ${n === 1 ? "año" : "años"}` }),
          ruta: "/inicio",
          requiere: "avisos_novedades",
        });
      }
    }
  }

  const lista = await personas([...new Set(brutos.map((b) => b.userId))]);
  const porId = new Map(lista.map((p) => [p.id, p]));
  const resultado: Candidato[] = [];
  for (const b of brutos) {
    const p = porId.get(b.userId);
    if (!p || !enviable(p.email)) continue;
    if (b.requiere && !p[b.requiere]) continue;
    resultado.push({ persona: p as Persona & { email: string }, ref: b.ref, valores: b.valores(p), ruta: b.ruta });
  }

  // Sin repetir: se quita a quien ya se le envió este mismo correo.
  if (resultado.length === 0) return resultado;
  const { data: hechos } = await admin.from("avisos_enviados").select("ref_id, user_id").eq("tipo", clave).in("user_id", [...new Set(resultado.map((c) => c.persona.id))]);
  const yaEnviado = new Set(((hechos ?? []) as { ref_id: string; user_id: string }[]).map((h) => `${h.ref_id}:${h.user_id}`));
  return resultado.filter((c) => !yaEnviado.has(`${c.ref}:${c.persona.id}`));
}

const diasDe = async (clave: ClavePlantilla): Promise<number> => {
  const { data } = await createAdminClient().from("automatizaciones").select("dias").eq("clave", clave).maybeSingle();
  return Number(data?.dias) || PLANTILLAS.find((p) => p.clave === clave)?.dias?.defecto || 1;
};

// «Hoy se enviaría a N personas»: para verlo antes de activar la plantilla. No envía nada.
export async function vistaPrevia(clave: ClavePlantilla): Promise<{ total: number; nombres: string[] }> {
  try {
    const lista = await candidatos(clave, await diasDe(clave));
    return { total: lista.length, nombres: lista.slice(0, 8).map((c) => nombreVisible(c.persona)) };
  } catch {
    return { total: 0, nombres: [] };
  }
}

async function enviarPlantilla(clave: ClavePlantilla): Promise<number> {
  let enviados = 0;
  await protegido(clave, async () => {
    const a = await cargar(clave);
    if (!a) return;
    for (const c of await candidatos(clave, a.dias)) {
      if (!(await reclamar(clave, c.ref, c.persona.id))) continue;
      const ok = await enviarCorreo(correo(a, c.persona, c.valores, c.ruta));
      if (ok) enviados++;
      else await soltar(clave, c.ref, c.persona.id);
    }
  });
  return enviados;
}

export const echamosMenos = () => enviarPlantilla("echamos_menos");
export const bienvenidaAlumna = () => enviarPlantilla("bienvenida");
export const recordatorioClase = () => enviarPlantilla("recordatorio_clase");
export const bonoAgotado = () => enviarPlantilla("bono_agotado");
export const aniversarioAlumna = () => enviarPlantilla("aniversario");
