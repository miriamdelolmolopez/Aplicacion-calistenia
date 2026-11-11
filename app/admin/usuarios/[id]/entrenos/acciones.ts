"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type CambioSerie = { id: string; reps: number | null; segundos: number | null; peso_kg: number | null; distancia_m: number | null; completada: boolean };

const entero = (v: number | null, max: number): number | null => (v === null || !Number.isFinite(v) ? null : Math.min(max, Math.max(0, Math.round(v))));

// Corrige un entreno ya hecho: duración, nombre de la sesión y lo anotado en cada serie.
export async function guardarEntreno(entrenoId: string, duracionMin: number | null, nombreSesion: string, cambios: CambioSerie[]): Promise<{ error?: string }> {
  await requireAdmin("usuarios");
  const admin = createAdminClient();
  const nombre = nombreSesion.trim().slice(0, 120);
  if (!nombre) return { error: "El entreno necesita un nombre." };
  const duracion = duracionMin === null || !Number.isFinite(duracionMin) ? null : Math.min(86400, Math.max(0, Math.round(duracionMin * 60)));

  const { data: entreno } = await admin.from("entrenos").select("id, user_id, terminado_en").eq("id", entrenoId).maybeSingle();
  if (!entreno) return { error: "No se ha encontrado el entreno." };

  const { error } = await admin.from("entrenos").update({ duracion_seg: duracion, nombre_sesion: nombre }).eq("id", entrenoId);
  if (error) return { error: "No se ha podido guardar el entreno." };

  for (const c of cambios) {
    const fila: Record<string, unknown> = {
      reps: entero(c.reps, 1000),
      segundos: entero(c.segundos, 86400),
      peso_kg: c.peso_kg === null || !Number.isFinite(c.peso_kg) ? null : Math.min(1000, Math.max(0, Math.round(c.peso_kg * 100) / 100)),
      distancia_m: entero(c.distancia_m, 1000000),
      completada: c.completada,
    };
    // Si se marca como hecha una serie que no lo estaba, se le pone la hora en que terminó el entreno.
    if (c.completada) fila.completada_en = entreno.terminado_en ?? new Date().toISOString();
    const { error: falloSerie } = await admin.from("entreno_series").update(fila).eq("id", c.id).eq("entreno_id", entrenoId);
    if (falloSerie) return { error: "Algunas series no se han podido guardar." };
  }
  revalidatePath(`/admin/usuarios/${entreno.user_id}/entrenos`);
  revalidatePath(`/admin/usuarios/${entreno.user_id}`);
  return {};
}

// Borra un entreno del historial (y sus series). No se puede deshacer.
export async function eliminarEntreno(entrenoId: string): Promise<{ error?: string }> {
  await requireAdmin("usuarios");
  const admin = createAdminClient();
  const { data: entreno } = await admin.from("entrenos").select("id, user_id").eq("id", entrenoId).maybeSingle();
  if (!entreno) return { error: "No se ha encontrado el entreno." };
  const { error } = await admin.from("entrenos").delete().eq("id", entrenoId);
  if (error) return { error: "No se ha podido eliminar." };
  revalidatePath(`/admin/usuarios/${entreno.user_id}/entrenos`);
  revalidatePath(`/admin/usuarios/${entreno.user_id}`);
  return {};
}
