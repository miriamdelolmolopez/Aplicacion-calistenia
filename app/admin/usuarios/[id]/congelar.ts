"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { descongelar } from "@/lib/congelados";
import { claveDia } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";

// Congela a un alumno/a: mientras tanto no cuenta como activo/a. Con «hasta» se descongela solo ese día (y te sale un aviso);
// sin fecha se queda congelado/a hasta que lo descongeles tú. Si ya estaba congelado/a, cambia el motivo o la fecha.
export async function congelarAlumno(userId: string, motivo: string, hasta: string | null): Promise<{ error?: string }> {
  await requireAdmin("usuarios");
  const texto = motivo.trim().slice(0, 500);
  if (!texto) return { error: "Escribe el motivo." };
  if (hasta && !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { error: "La fecha no es válida." };
  if (hasta && hasta <= claveDia(new Date().toISOString())) return { error: "La fecha de descongelar tiene que ser posterior a hoy." };

  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("rol, congelado").eq("id", userId).maybeSingle();
  if (!p) return { error: "No se ha encontrado a esa persona." };
  if (p.rol !== "alumno") return { error: "Solo se puede congelar a alumnos/as." };

  const cambios: Record<string, unknown> = { congelado: true, congelado_hasta: hasta || null, congelado_motivo: texto };
  if (!p.congelado) cambios.congelado_desde = new Date().toISOString();
  const { error } = await admin.from("profiles").update(cambios).eq("id", userId);
  if (error) return { error: "No se ha podido congelar. Puede que falte ejecutar el archivo 096 en Supabase." };
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/inicio");
  return {};
}

export async function descongelarAlumno(userId: string): Promise<{ error?: string }> {
  await requireAdmin("usuarios");
  const r = await descongelar(userId, "manual");
  if (r.error) return r;
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/inicio");
  return {};
}
