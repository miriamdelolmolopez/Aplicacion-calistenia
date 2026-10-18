import "server-only";
import { enviarCorreo } from "./email";
import {
  correoBonoCaduca,
  correoClaseCancelada,
  correoMinimoNoAlcanzado,
  correoPlazaLiberada,
  correoReserva,
  type Idioma,
} from "./plantillas-email";
import { createAdminClient } from "./supabase/admin";

// Avisos por email. Ninguna función lanza errores: un correo que falla no puede
// romper una reserva ni una cancelación.
//
// Esenciales (se envían siempre): plaza liberada y clase cancelada.
// Opcionales (la persona puede desactivarlos en su cuenta): confirmación de reserva
// y bono a punto de caducar.

type Persona = {
  id: string;
  email: string | null;
  nombre: string | null;
  idioma: Idioma;
  avisos_reserva: boolean;
  avisos_bono: boolean;
};

type Clase = {
  id: string;
  empieza_en: string;
  estado: string;
  motivo_cancelacion: string | null;
  tipos_clase: { nombre: string; minimo_alumnos: number } | null;
};

// Las cuentas de prueba (example.com) no reciben correos reales.
const enviable = (email: string | null): email is string =>
  !!email && !email.toLowerCase().endsWith("@example.com");

async function personas(ids: string[]): Promise<Persona[]> {
  if (ids.length === 0) return [];
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, email, nombre, idioma, avisos_reserva, avisos_bono")
    .in("id", ids);
  return (data ?? []) as Persona[];
}

async function clase(sesionId: string): Promise<Clase | null> {
  const { data } = await createAdminClient()
    .from("sesiones_clase")
    .select("id, empieza_en, estado, motivo_cancelacion, tipos_clase(nombre, minimo_alumnos)")
    .eq("id", sesionId)
    .maybeSingle();
  return (data as unknown as Clase | null) ?? null;
}

const info = (c: Clase) => ({ nombre: c.tipos_clase?.nombre ?? "Clase", empieza_en: c.empieza_en });

async function protegido(nombre: string, tarea: () => Promise<void>) {
  try {
    await tarea();
  } catch (error) {
    console.warn("[avisos] %s: %s", nombre, String(error));
  }
}

// Confirmación de reserva (opcional).
export function avisarReserva(userId: string, sesionId: string) {
  return protegido("reserva", async () => {
    const [[persona], c] = await Promise.all([personas([userId]), clase(sesionId)]);
    if (!persona || !c || !enviable(persona.email) || !persona.avisos_reserva) return;
    await enviarCorreo(
      correoReserva({ para: persona.email, idioma: persona.idioma, nombrePersona: persona.nombre ?? "", clase: info(c) }),
    );
  });
}

// Plaza liberada: se avisa a toda la lista de espera de esa clase (esencial).
export function avisarPlazaLiberada(sesionId: string) {
  return protegido("plaza liberada", async () => {
    const admin = createAdminClient();
    const c = await clase(sesionId);
    if (!c || c.estado !== "programada" || new Date(c.empieza_en) <= new Date()) return;

    const { data: espera } = await admin
      .from("lista_espera")
      .select("user_id")
      .eq("sesion_id", sesionId)
      .order("creado_en");
    const lista = await personas((espera ?? []).map((e) => e.user_id));
    if (lista.length === 0) return;

    const { data: ajuste } = await admin.from("ajustes").select("valor").eq("clave", "espera_prioridad_horas").maybeSingle();
    const horas = Number(ajuste?.valor ?? 2) || 2;

    for (const p of lista) {
      if (!enviable(p.email)) continue;
      await enviarCorreo(
        correoPlazaLiberada({ para: p.email, idioma: p.idioma, nombrePersona: p.nombre ?? "", clase: info(c), horasPrioridad: horas }),
      );
    }
  });
}

// Antes de cancelar una clase hay que anotar quién estaba en la lista de espera,
// porque la cancelación la vacía.
export async function personasEnEspera(sesionId: string): Promise<string[]> {
  try {
    const { data } = await createAdminClient().from("lista_espera").select("user_id").eq("sesion_id", sesionId);
    return (data ?? []).map((e) => e.user_id);
  } catch {
    return [];
  }
}

// Clase cancelada (esencial): a las personas apuntadas y a las de la lista de espera.
export function avisarClaseCancelada(sesionId: string, dias: number, enEspera: string[]) {
  return protegido("clase cancelada", async () => {
    const c = await clase(sesionId);
    if (!c) return;

    const { data: reservas } = await createAdminClient()
      .from("reservas")
      .select("user_id, clase_devuelta")
      .eq("sesion_id", sesionId)
      .eq("estado", "cancelada_clase");
    const devuelta = new Map((reservas ?? []).map((r) => [r.user_id as string, !!r.clase_devuelta]));
    const ids = [...new Set([...devuelta.keys(), ...enEspera])];

    for (const p of await personas(ids)) {
      if (!enviable(p.email)) continue;
      await enviarCorreo(
        correoClaseCancelada({
          para: p.email,
          idioma: p.idioma,
          nombrePersona: p.nombre ?? "",
          clase: info(c),
          motivo: c.motivo_cancelacion,
          devuelta: devuelta.get(p.id) ?? false,
          dias,
          enEspera: !devuelta.has(p.id),
        }),
      );
    }
  });
}

// Apunta que un aviso automático se va a enviar. Devuelve false si ya se envió antes.
async function reclamar(tipo: "bono_caduca" | "minimo_clase", refId: string, userId: string): Promise<boolean> {
  const { error } = await createAdminClient().from("avisos_enviados").insert({ tipo, ref_id: refId, user_id: userId });
  return !error;
}

async function soltar(tipo: "bono_caduca" | "minimo_clase", refId: string, userId: string) {
  await createAdminClient().from("avisos_enviados").delete().eq("tipo", tipo).eq("ref_id", refId).eq("user_id", userId);
}

const HORA = 3600 * 1000;

// Bonos que caducan en los próximos 3 días (opcional). Lo lanza el cron una vez al día.
export async function avisarBonosPorCaducar(): Promise<number> {
  let enviados = 0;
  await protegido("bonos por caducar", async () => {
    const ahora = Date.now();
    const { data } = await createAdminClient()
      .from("bonos")
      .select("id, user_id, servicio, clases_restantes, caduca_en, tipos_bono(nombre)")
      .eq("estado", "activo")
      .gt("caduca_en", new Date(ahora).toISOString())
      .lte("caduca_en", new Date(ahora + 72 * HORA).toISOString());
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
      const ok = await enviarCorreo(
        correoBonoCaduca({
          para: p.email,
          idioma: p.idioma,
          nombrePersona: p.nombre ?? "",
          nombreBono: b.tipos_bono?.nombre ?? "bono",
          caduca: b.caduca_en,
          clasesRestantes: b.clases_restantes,
          esOnline: b.servicio === "online",
        }),
      );
      if (ok) enviados++;
      else await soltar("bono_caduca", b.id, p.id);
    }
  });
  return enviados;
}

// Clases de las próximas 24 h que no llegan al mínimo: aviso a Miriam. Lo lanza el cron.
export async function avisarMinimos(): Promise<number> {
  let enviados = 0;
  await protegido("mínimos", async () => {
    const admin = createAdminClient();
    const ahora = Date.now();
    const { data: sesiones } = await admin
      .from("sesiones_clase")
      .select("id, empieza_en, estado, motivo_cancelacion, tipos_clase(nombre, minimo_alumnos)")
      .eq("estado", "programada")
      .gt("empieza_en", new Date(ahora).toISOString())
      .lte("empieza_en", new Date(ahora + 24 * HORA).toISOString());
    const { data: admins } = await admin.from("profiles").select("id, email").eq("rol", "admin");

    for (const c of (sesiones ?? []) as unknown as Clase[]) {
      const minimo = c.tipos_clase?.minimo_alumnos ?? 0;
      if (minimo <= 0) continue;
      const { count } = await admin
        .from("reservas")
        .select("id", { count: "exact", head: true })
        .eq("sesion_id", c.id)
        .eq("estado", "reservada");
      const apuntados = count ?? 0;
      if (apuntados >= minimo) continue;

      for (const a of admins ?? []) {
        if (!enviable(a.email)) continue;
        if (!(await reclamar("minimo_clase", c.id, a.id))) continue;
        const ok = await enviarCorreo(correoMinimoNoAlcanzado({ para: a.email, clase: info(c), apuntados, minimo }));
        if (ok) enviados++;
        else await soltar("minimo_clase", c.id, a.id);
      }
    }
  });
  return enviados;
}
