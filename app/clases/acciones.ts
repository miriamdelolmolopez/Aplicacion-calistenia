"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { avisarCancelacionAlumno, avisarAdminCancelacion, avisarAdminReserva, avisarClaseCancelada, avisarPlazaLiberada, avisarReserva, personasEnEspera } from "@/lib/avisos";
import { fechaCorta } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Resultado = {
  ok: boolean;
  codigo?: string; // para el error: se traduce en la pantalla
  dato?: string; // un dato para completar el mensaje (una fecha, o «clases que gasta|clases que quedan»)
  devuelta?: boolean;
};

// Los mensajes de la base de datos están en español; aquí se convierten en códigos
// para poder enseñarlos en el idioma de cada persona.
const ERRORES: [string, string][] = [
  ["reservada para la lista", "prioridad"],
  ["Completa tus datos", "datos"],
  ["Ya has usado", "pruebaUsada"],
  ["No quedan plazas de clase de prueba", "sinPruebas"],
  ["no admite clase de prueba", "noPrueba"],
  ["todavía tiene plazas libres", "hayPlazas"],
  ["apuntarse a la lista", "soloAlumnosEspera"],
  ["completa", "completa"],
  ["está cancelada", "cancelada"],
  ["ya ha empezado", "empezada"],
  ["Todavía no se puede", "pronto"],
  ["Solo los alumnos", "soloAlumnos"],
  ["Ya tienes plaza", "yaTienes"],
  ["ningún bono activo", "sinBono"],
  ["caduca antes", "caduca"],
  ["gasta", "pocosCreditos"],
  ["Ya no tienes este servicio", "sinServicio"],
  ["no es tuya", "noTuya"],
  ["ya estaba cancelada", "yaCancelada"],
];

// Cuando no se puede reservar por la tarifa, se mira qué le pasa exactamente (caducada, agotada, caduca antes de esa clase…)
// para decírselo con claridad.
async function motivoTarifa(userId: string, sesionId: string, codigo: string): Promise<{ codigo: string; dato?: string }> {
  if (!["sinBono", "caduca", "pocosCreditos"].includes(codigo)) return { codigo };
  const admin = createAdminClient();
  const { data: s } = await admin.from("sesiones_clase").select("tipos_clase(servicio, creditos)").eq("id", sesionId).maybeSingle();
  const tipo = (s as unknown as { tipos_clase: { servicio: string; creditos: number | null } | null } | null)?.tipos_clase;
  if (!tipo) return { codigo };
  const { data } = await admin
    .from("bonos")
    .select("estado, caduca_en, clases_restantes, creado_en")
    .eq("user_id", userId)
    .eq("servicio", tipo.servicio)
    .order("creado_en", { ascending: false });
  const bonos = (data ?? []) as { estado: string; caduca_en: string | null; clases_restantes: number }[];
  const activo = bonos.find((b) => b.estado === "activo");
  if (activo) {
    if (codigo === "caduca" && activo.caduca_en) return { codigo, dato: fechaCorta(activo.caduca_en) };
    if (codigo === "pocosCreditos") return { codigo, dato: `${Math.max(1, tipo.creditos ?? 1)}|${activo.clases_restantes}` };
    return { codigo };
  }
  const ultimo = bonos[0];
  if (ultimo?.estado === "caducado") return { codigo: "tarifaCaducada", dato: ultimo.caduca_en ? fechaCorta(ultimo.caduca_en) : undefined };
  // Sin clases de ese servicio pero con la tarifa todavía dentro de sus fechas (las de otro servicio sí se pueden reservar).
  if (ultimo?.estado === "agotado" && ultimo.caduca_en && new Date(ultimo.caduca_en).getTime() > Date.now()) return { codigo: "tarifaAgotada", dato: `${fechaCorta(ultimo.caduca_en)}|${tipo.servicio}` };
  if (ultimo?.estado === "agotado") return { codigo: "tarifaCaducada", dato: ultimo.caduca_en ? fechaCorta(ultimo.caduca_en) : undefined };
  return { codigo: "sinBono" };
}

function codigoDe(mensaje: string): string {
  return ERRORES.find(([trozo]) => mensaje.includes(trozo))?.[1] ?? "general";
}

async function personaActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function reservarClase(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("reservar_clase", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, ...(await motivoTarifa(user.id, sesionId, codigoDe(error.message))) };
  after(() => Promise.all([avisarReserva(user.id, sesionId), avisarAdminReserva(user.id, sesionId)]));
  return { ok: true };
}

export async function unirseListaEspera(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("unirse_lista_espera", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function salirListaEspera(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("salir_lista_espera", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function cancelarMiReserva(reservaId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const admin = createAdminClient();
  const { data: reserva } = await admin
    .from("reservas")
    .select("sesion_id, sesiones_clase(empieza_en)")
    .eq("id", reservaId)
    .eq("user_id", user.id)
    .maybeSingle();
  // Solo se puede anular una reserva de una clase que todavía no ha empezado.
  const empieza = (reserva?.sesiones_clase as unknown as { empieza_en: string } | null)?.empieza_en;
  if (empieza && new Date(empieza).getTime() <= Date.now()) return { ok: false, codigo: "empezada" };

  const { data, error } = await admin.rpc("cancelar_reserva", {
    p_user: user.id,
    p_reserva: reservaId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  if (reserva) {
    after(() => Promise.all([avisarPlazaLiberada(reserva.sesion_id), avisarAdminCancelacion(user.id, reserva.sesion_id, data === "devuelta"), avisarCancelacionAlumno(user.id, reserva.sesion_id, data === "devuelta")]));
  }
  return { ok: true, devuelta: data === "devuelta" };
}

// ¿Puede esta persona gestionar la clase? La administradora siempre; un coach, solo las clases que da él o ella.
async function puedeGestionarClase(userId: string, sesionId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol, es_coach").eq("id", userId).maybeSingle();
  if (yo?.rol === "admin") return true;
  if (!yo?.es_coach) return false;
  const { data: s } = await admin.from("sesiones_clase").select("coach_id").eq("id", sesionId).maybeSingle();
  return s?.coach_id === userId;
}

// Quién da cada clase (coach), con su nombre y su foto, para enseñarlo en las tarjetas.
export async function obtenerCoachesClases(sesionIds: string[]): Promise<Record<string, { coachId: string; nombre: string; foto: string | null }>> {
  const user = await personaActual();
  if (!user || sesionIds.length === 0) return {};
  const admin = createAdminClient();
  const { data: sesiones } = await admin.from("sesiones_clase").select("id, coach_id").in("id", sesionIds.slice(0, 300)).not("coach_id", "is", null);
  const coachIds = [...new Set((sesiones ?? []).map((s) => s.coach_id as string))];
  if (coachIds.length === 0) return {};
  const { data: perfiles } = await admin.from("profiles").select("id, nombre, foto_path").in("id", coachIds);
  const { data: firmadas } = await admin.storage.from("avatares").createSignedUrls((perfiles ?? []).map((p) => p.foto_path as string).filter(Boolean), 3600);
  const porCoach = new Map((perfiles ?? []).map((p) => [p.id as string, { nombre: (p.nombre as string | null) || "Coach", foto: p.foto_path ? (firmadas ?? []).find((x) => x.path === p.foto_path)?.signedUrl ?? null : null }]));
  return Object.fromEntries((sesiones ?? []).map((s) => [s.id as string, { coachId: s.coach_id as string, ...(porCoach.get(s.coach_id as string) ?? { nombre: "Coach", foto: null }) }]));
}

export type CanceladaClase = { userId: string; nombre: string; tarde: boolean };

// Quién ha cancelado su reserva en cada clase. «tarde» = cancelada fuera de plazo: la clase le cuenta (no se le devuelve).
// Solo lo ve la administradora y, de sus propias clases, el coach.
export async function obtenerCanceladas(sesionIds: string[]): Promise<Record<string, CanceladaClase[]>> {
  const user = await personaActual();
  if (!user || sesionIds.length === 0) return {};
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol, es_coach").eq("id", user.id).maybeSingle();
  if (yo?.rol !== "admin" && !yo?.es_coach) return {};

  let consulta = admin.from("sesiones_clase").select("id").in("id", sesionIds.slice(0, 300)).eq("estado", "programada");
  if (yo?.rol !== "admin") consulta = consulta.eq("coach_id", user.id);
  const { data: sesiones } = await consulta;
  const ids = (sesiones ?? []).map((s) => s.id as string);
  if (ids.length === 0) return {};

  const { data: reservas } = await admin
    .from("reservas")
    .select("sesion_id, user_id, estado, cancelada_en")
    .in("sesion_id", ids)
    .in("estado", ["cancelada", "cancelada_tarde"])
    .order("cancelada_en");
  const filas = (reservas ?? []) as { sesion_id: string; user_id: string; estado: string }[];
  if (filas.length === 0) return {};
  const { data: perfiles } = await admin.from("profiles").select("id, nombre, apellidos").in("id", [...new Set(filas.map((f) => f.user_id))]);
  const nombres = new Map((perfiles ?? []).map((p) => [p.id as string, [p.nombre, p.apellidos].filter(Boolean).join(" ") || "—"]));

  const salida: Record<string, CanceladaClase[]> = {};
  for (const f of filas) (salida[f.sesion_id] ??= []).push({ userId: f.user_id, nombre: nombres.get(f.user_id) ?? "—", tarde: f.estado === "cancelada_tarde" });
  return salida;
}

// Si la persona que llama es coach (y su id).
export async function soyCoach(): Promise<{ id: string; esCoach: boolean }> {
  const user = await personaActual();
  if (!user) return { id: "", esCoach: false };
  const { data } = await createAdminClient().from("profiles").select("es_coach").eq("id", user.id).maybeSingle();
  return { id: user.id, esCoach: !!data?.es_coach };
}

// El coach cancela una clase que da él o ella: devuelve su clase a toda la gente apuntada (y puede alargar sus bonos).
export async function cancelarClaseCoach(_previo: { error?: string; mensaje?: string }, formData: FormData): Promise<{ error?: string; mensaje?: string }> {
  const user = await personaActual();
  if (!user) return { error: "Tu sesión ha caducado." };
  const id = String(formData.get("sesionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await puedeGestionarClase(user.id, id))) return { error: "Solo puedes cancelar las clases que das tú." };
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 200);
  const dias = Math.floor(Number(formData.get("dias") ?? 0)) || 0;
  if (!(dias >= 0 && dias <= 60)) return { error: "Los días de ampliación van de 0 a 60." };

  const enEspera = await personasEnEspera(id);
  const { data, error } = await createAdminClient().rpc("cancelar_clase", { p_sesion: id, p_motivo: motivo, p_dias: dias, p_admin: user.id });
  if (error) return { error: error.message };
  after(() => avisarClaseCancelada(id, dias, enEspera));
  revalidatePath("/clases");
  revalidatePath("/admin/reservas");
  const personas = Number(data ?? 0);
  return { mensaje: `Clase cancelada. Se ha devuelto la clase a ${personas} ${personas === 1 ? "persona" : "personas"}.` };
}

// Marca quién vino y quién no a una clase (la administradora, o el coach que la da).
export async function marcarAsistenciaClase(reservaId: string, valor: "no_asistio" | null): Promise<{ ok: boolean; error?: string }> {
  const user = await personaActual();
  if (!user) return { ok: false, error: "Tu sesión ha caducado." };
  if (!/^[0-9a-f-]{36}$/i.test(reservaId) || (valor !== null && valor !== "no_asistio")) return { ok: false, error: "Datos no válidos." };
  const admin = createAdminClient();
  const { data: reserva } = await admin.from("reservas").select("sesion_id").eq("id", reservaId).maybeSingle();
  if (!reserva || !(await puedeGestionarClase(user.id, reserva.sesion_id as string))) return { ok: false, error: "No puedes cambiar esta clase." };

  const { error } = await admin.from("reservas").update({ asistencia: valor, asistencia_en: valor ? new Date().toISOString() : null }).eq("id", reservaId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/admin/reservas");
  return { ok: true };
}

export type Apuntado = {
  reservaId: string;
  userId: string;
  nombre: string;
  esPrueba: boolean;
  asistencia: "asistio" | "no_asistio" | null;
};

// Quién está apuntado a una clase, con lo necesario para abrir su ficha o marcar que no vino. Solo la administradora.
export async function obtenerApuntadosClase(sesionId: string): Promise<Apuntado[]> {
  const user = await personaActual();
  if (!user) return [];
  const admin = createAdminClient();
  if (!(await puedeGestionarClase(user.id, sesionId))) return [];

  const { data } = await admin
    .from("reservas")
    .select("id, user_id, es_prueba, asistencia")
    .eq("sesion_id", sesionId)
    .eq("estado", "reservada")
    .order("creado_en");
  const reservas = (data ?? []) as { id: string; user_id: string; es_prueba: boolean; asistencia: "asistio" | "no_asistio" | null }[];
  if (reservas.length === 0) return [];

  const { data: perfiles } = await admin
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .in("id", reservas.map((r) => r.user_id));
  const nombres = new Map(
    ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null }[]).map((p) => [
      p.id,
      [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "Sin nombre",
    ]),
  );
  return reservas.map((r) => ({
    reservaId: r.id,
    userId: r.user_id,
    nombre: nombres.get(r.user_id) ?? "Sin nombre",
    esPrueba: r.es_prueba,
    asistencia: r.asistencia,
  }));
}

export type ClasePasada = {
  id: string;
  tipo: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  ocupadas: number;
  mi_reserva: null;
  apuntados: string[];
  apuntados_ids: string[];
  plazas_prueba: number;
  ocupadas_prueba: number;
  en_espera: false;
  posicion: 0;
  hay_espera: 0;
  prioridad: false;
  duracion_min: number;
  servicio: string;
  incluido: true;
};

// Las clases que ya han pasado, con quién estaba apuntado. Solo para la administradora.
export async function obtenerClasesPasadas(semanas: number): Promise<ClasePasada[]> {
  const user = await personaActual();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (yo?.rol !== "admin") return [];

  const ahora = Date.now();
  const { data: sesiones } = await admin
    .from("sesiones_clase")
    .select("id, empieza_en, plazas, estado, plazas_prueba, tipos_clase(nombre, duracion_min, servicio)")
    .gte("empieza_en", new Date(ahora - semanas * 7 * 86400000).toISOString())
    .lt("empieza_en", new Date(ahora).toISOString())
    .order("empieza_en");
  type Fila = { id: string; empieza_en: string; plazas: number; estado: string; plazas_prueba: number; tipos_clase: { nombre: string; duracion_min: number; servicio: string } | null };
  const lista = (sesiones ?? []) as unknown as Fila[];
  if (lista.length === 0) return [];

  // Se piden las reservas por tandas para no pasarse del largo de la consulta.
  const ids = lista.map((s) => s.id);
  const tandas: string[][] = [];
  for (let i = 0; i < ids.length; i += 40) tandas.push(ids.slice(i, i + 40));
  const [respuestas, { data: perfiles }] = await Promise.all([
    Promise.all(
      tandas.map((t) =>
        admin.from("reservas").select("sesion_id, user_id, es_prueba, creado_en").in("sesion_id", t).eq("estado", "reservada").order("creado_en"),
      ),
    ),
    admin.from("profiles").select("id, nombre, apellidos").limit(5000),
  ]);
  const reservas = respuestas.flatMap((r) => (r.data ?? []) as { sesion_id: string; user_id: string; es_prueba: boolean }[]);
  const nombres = new Map(
    ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null }[]).map((p) => [
      p.id,
      (p.nombre?.trim().split(" ")[0] || "Alumno") + (p.apellidos?.trim() ? ` ${p.apellidos.trim().charAt(0).toUpperCase()}.` : ""),
    ]),
  );

  return lista.map((s) => {
    const suyas = reservas.filter((r) => r.sesion_id === s.id);
    return {
      id: s.id,
      tipo: s.tipos_clase?.nombre ?? "Clase",
      empieza_en: s.empieza_en,
      plazas: s.plazas,
      estado: s.estado,
      ocupadas: suyas.length,
      mi_reserva: null,
      apuntados: suyas.map((r) => nombres.get(r.user_id) ?? "Alumno"),
      apuntados_ids: suyas.map((r) => r.user_id),
      plazas_prueba: s.plazas_prueba,
      ocupadas_prueba: suyas.filter((r) => r.es_prueba).length,
      en_espera: false,
      posicion: 0,
      hay_espera: 0,
      prioridad: false,
      duracion_min: s.tipos_clase?.duracion_min ?? 60,
      servicio: s.tipos_clase?.servicio ?? "grupal",
      incluido: true,
    } satisfies ClasePasada;
  });
}
