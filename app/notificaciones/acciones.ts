"use server";

import { enSoloLectura } from "@/lib/como";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type NotificacionFila = { id: string; tipo: string; titulo: string; cuerpo: string | null; enlace: string | null; leida: boolean; creada_en: string };

async function yo(): Promise<string | null> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return user?.id ?? null;
}

// Las últimas notificaciones de la persona que llama.
export async function obtenerMisNotificaciones(): Promise<NotificacionFila[]> {
  const id = await yo();
  if (!id) return [];
  const { data } = await createAdminClient()
    .from("notificaciones")
    .select("id, tipo, titulo, cuerpo, enlace, leida, creada_en")
    .eq("user_id", id)
    .order("creada_en", { ascending: false })
    .limit(60);
  return (data ?? []) as NotificacionFila[];
}

export async function contarNoLeidas(): Promise<number> {
  const id = await yo();
  if (!id) return 0;
  const { count } = await createAdminClient().from("notificaciones").select("id", { count: "exact", head: true }).eq("user_id", id).eq("leida", false);
  return count ?? 0;
}

// Marca como leídas las indicadas (o todas si no se indica ninguna).
export async function marcarLeidas(ids?: string[]): Promise<void> {
  if (await enSoloLectura()) return;
  const id = await yo();
  if (!id) return;
  let consulta = createAdminClient().from("notificaciones").update({ leida: true }).eq("user_id", id).eq("leida", false);
  if (ids && ids.length > 0) consulta = consulta.in("id", ids);
  await consulta;
}

export async function borrarNotificacion(notificacionId: string): Promise<void> {
  if (await enSoloLectura()) return;
  const id = await yo();
  if (!id || !/^[0-9a-f-]{36}$/i.test(notificacionId)) return;
  await createAdminClient().from("notificaciones").delete().eq("id", notificacionId).eq("user_id", id);
}

// Qué avisos quiere recibir dentro de la app y en el móvil (lo que no está apuntado cuenta como activado).
export async function obtenerPreferenciasApp(): Promise<Record<string, boolean>> {
  const id = await yo();
  if (!id) return {};
  const { data } = await createAdminClient().from("profiles").select("avisos_app").eq("id", id).maybeSingle();
  return (data?.avisos_app as Record<string, boolean> | null) ?? {};
}

export async function guardarPreferenciaApp(clave: string, valor: boolean): Promise<void> {
  if (await enSoloLectura()) return;
  const id = await yo();
  if (!id || !/^[a-z_]{3,30}$/.test(clave)) return;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("avisos_app").eq("id", id).maybeSingle();
  const actual = (data?.avisos_app as Record<string, boolean> | null) ?? {};
  await admin.from("profiles").update({ avisos_app: { ...actual, [clave]: valor } }).eq("id", id);
}

// Notificaciones en el móvil: guarda (o quita) el aparato de la persona.
export async function guardarSuscripcionPush(suscripcion: { endpoint: string; p256dh: string; auth: string }): Promise<{ ok: boolean }> {
  if (await enSoloLectura()) return { ok: false };
  const id = await yo();
  if (!id || !suscripcion.endpoint.startsWith("https://") || !suscripcion.p256dh || !suscripcion.auth) return { ok: false };
  const { error } = await createAdminClient().from("push_suscripciones").upsert({ user_id: id, endpoint: suscripcion.endpoint, p256dh: suscripcion.p256dh, auth: suscripcion.auth }, { onConflict: "endpoint" });
  return { ok: !error };
}

export async function quitarSuscripcionPush(endpoint: string): Promise<void> {
  if (await enSoloLectura()) return;
  const id = await yo();
  if (!id) return;
  await createAdminClient().from("push_suscripciones").delete().eq("endpoint", endpoint).eq("user_id", id);
}

// Los días de la semana en que la persona quiere entrenar online (1 = lunes ... 7 = domingo). Es opcional: con ellos la app le
// avisa por la mañana de que «hoy toca entrenamiento».
export async function obtenerDiasEntreno(): Promise<{ dias: number[]; online: boolean }> {
  const id = await yo();
  if (!id) return { dias: [], online: false };
  const admin = createAdminClient();
  const [{ data: perfil }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("dias_entreno").eq("id", id).maybeSingle(),
    admin.from("bonos").select("id").eq("user_id", id).eq("servicio", "online").in("estado", ["activo", "agotado"]).gt("caduca_en", new Date().toISOString()).limit(1),
  ]);
  const dias = ((perfil as { dias_entreno?: number[] } | null)?.dias_entreno ?? []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  return { dias, online: (plan ?? []).length > 0 };
}

export async function guardarDiasEntreno(dias: number[]): Promise<{ ok: boolean }> {
  if (await enSoloLectura()) return { ok: false };
  const id = await yo();
  if (!id) return { ok: false };
  const limpios = [...new Set((Array.isArray(dias) ? dias : []).map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort();
  const { error } = await createAdminClient().from("profiles").update({ dias_entreno: limpios }).eq("id", id);
  return { ok: !error };
}
