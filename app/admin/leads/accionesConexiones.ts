"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { nuevaClave } from "@/lib/leadsEntrada";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

// La dirección completa a la que el formulario envía los datos. Solo se enseña al crearla o regenerarla (la clave no se guarda tal cual).
async function direccionDe(token: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}/api/leads/entrada/${token}`;
}

export async function crearConexion(nombre: string): Promise<{ ok: boolean; error?: string; direccion?: string }> {
  const { user } = await requireAdmin("leads");
  const limpio = nombre.trim().slice(0, 120);
  if (!limpio) return { ok: false, error: "Ponle un nombre (será el «origen» de los leads que lleguen)." };
  const admin = createAdminClient();
  const { count } = await admin.from("leads_conexiones").select("id", { count: "exact", head: true }).eq("entrenador_id", user.id);
  if ((count ?? 0) >= 20) return { ok: false, error: "Ya tienes 20 conexiones. Elimina alguna que no uses." };
  const clave = nuevaClave();
  const { error } = await admin.from("leads_conexiones").insert({ entrenador_id: user.id, nombre: limpio, token_hash: clave.hash, ultimos4: clave.ultimos4 });
  if (error) return { ok: false, error: "No se ha podido crear la conexión. Inténtalo de nuevo." };
  revalidatePath("/admin/leads");
  return { ok: true, direccion: await direccionDe(clave.token) };
}

export async function regenerarConexion(id: string): Promise<{ ok: boolean; error?: string; direccion?: string }> {
  const { user } = await requireAdmin("leads");
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const clave = nuevaClave();
  const { data, error } = await createAdminClient().from("leads_conexiones").update({ token_hash: clave.hash, ultimos4: clave.ultimos4 }).eq("id", id).eq("entrenador_id", user.id).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "No se ha encontrado la conexión." };
  revalidatePath("/admin/leads");
  return { ok: true, direccion: await direccionDe(clave.token) };
}

export async function alternarConexion(id: string, activo: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin("leads");
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const { error } = await createAdminClient().from("leads_conexiones").update({ activo }).eq("id", id).eq("entrenador_id", user.id);
  if (error) return { ok: false, error: "No se ha podido cambiar." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function eliminarConexion(id: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin("leads");
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const { error } = await createAdminClient().from("leads_conexiones").delete().eq("id", id).eq("entrenador_id", user.id);
  if (error) return { ok: false, error: "No se ha podido eliminar." };
  revalidatePath("/admin/leads");
  return { ok: true };
}
