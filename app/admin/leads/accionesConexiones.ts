"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireLeads } from "./acceso";
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

// El tipo y las etiquetas elegidos tienen que ser de este entrenador (lo que llega del navegador no se da por bueno).
async function validarElegidos(entrenadorId: string, tipoId: string | null | undefined, etiquetaIds: string[] | undefined): Promise<{ tipo_id: string | null; etiqueta_ids: string[] } | { error: string }> {
  const admin = createAdminClient();
  let tipo: string | null = null;
  if (tipoId) {
    const { data } = UUID.test(tipoId) ? await admin.from("leads_tipos").select("id").eq("id", tipoId).eq("entrenador_id", entrenadorId).maybeSingle() : { data: null };
    if (!data) return { error: "El tipo de lead no es válido." };
    tipo = tipoId;
  }
  const pedidas = [...new Set((etiquetaIds ?? []).filter((x) => UUID.test(x)))].slice(0, 40);
  let etiquetas: string[] = [];
  if (pedidas.length > 0) {
    const { data } = await admin.from("leads_etiquetas").select("id").eq("entrenador_id", entrenadorId).in("id", pedidas);
    etiquetas = ((data ?? []) as { id: string }[]).map((x) => x.id);
  }
  return { tipo_id: tipo, etiqueta_ids: etiquetas };
}

export async function crearConexion(nombre: string, tipoId?: string | null, etiquetaIds?: string[]): Promise<{ ok: boolean; error?: string; direccion?: string }> {
  const { duenoId } = await requireLeads();
  const limpio = nombre.trim().slice(0, 120);
  if (!limpio) return { ok: false, error: "Ponle un nombre (será el «origen» de los leads que lleguen)." };
  const admin = createAdminClient();
  const { count } = await admin.from("leads_conexiones").select("id", { count: "exact", head: true }).eq("entrenador_id", duenoId);
  if ((count ?? 0) >= 20) return { ok: false, error: "Ya tienes 20 conexiones. Elimina alguna que no uses." };
  const elegidos = await validarElegidos(duenoId, tipoId, etiquetaIds);
  if ("error" in elegidos) return { ok: false, error: elegidos.error };
  const clave = nuevaClave();
  const { error } = await admin.from("leads_conexiones").insert({ entrenador_id: duenoId, nombre: limpio, token_hash: clave.hash, ultimos4: clave.ultimos4, ...elegidos });
  if (error) return { ok: false, error: "No se ha podido crear la conexión. Inténtalo de nuevo." };
  revalidatePath("/admin/leads");
  return { ok: true, direccion: await direccionDe(clave.token) };
}

// Cambia el nombre, el tipo y las etiquetas de una conexión. No toca su dirección (clave) ni los leads que ya llegaron.
export async function editarConexion(id: string, nombre: string, tipoId: string | null, etiquetaIds: string[]): Promise<{ ok: boolean; error?: string }> {
  const { duenoId } = await requireLeads();
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const limpio = nombre.trim().slice(0, 120);
  if (!limpio) return { ok: false, error: "Ponle un nombre (será el «origen» de los leads que lleguen)." };
  const elegidos = await validarElegidos(duenoId, tipoId, etiquetaIds);
  if ("error" in elegidos) return { ok: false, error: elegidos.error };
  const { data, error } = await createAdminClient().from("leads_conexiones").update({ nombre: limpio, ...elegidos }).eq("id", id).eq("entrenador_id", duenoId).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "No se ha podido guardar la conexión." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function regenerarConexion(id: string): Promise<{ ok: boolean; error?: string; direccion?: string }> {
  const { duenoId } = await requireLeads();
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const clave = nuevaClave();
  const { data, error } = await createAdminClient().from("leads_conexiones").update({ token_hash: clave.hash, ultimos4: clave.ultimos4 }).eq("id", id).eq("entrenador_id", duenoId).select("id");
  if (error || !data || data.length === 0) return { ok: false, error: "No se ha encontrado la conexión." };
  revalidatePath("/admin/leads");
  return { ok: true, direccion: await direccionDe(clave.token) };
}

export async function alternarConexion(id: string, activo: boolean): Promise<{ ok: boolean; error?: string }> {
  const { duenoId } = await requireLeads();
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const { error } = await createAdminClient().from("leads_conexiones").update({ activo }).eq("id", id).eq("entrenador_id", duenoId);
  if (error) return { ok: false, error: "No se ha podido cambiar." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function eliminarConexion(id: string): Promise<{ ok: boolean; error?: string }> {
  const { duenoId } = await requireLeads();
  if (!UUID.test(id)) return { ok: false, error: "Conexión no válida." };
  const { error } = await createAdminClient().from("leads_conexiones").delete().eq("id", id).eq("entrenador_id", duenoId);
  if (error) return { ok: false, error: "No se ha podido eliminar." };
  revalidatePath("/admin/leads");
  return { ok: true };
}
