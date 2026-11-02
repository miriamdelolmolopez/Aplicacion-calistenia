import "server-only";
import { createAdminClient } from "./supabase/admin";

export type Coach = { id: string; nombre: string };

// Las personas marcadas como coach (entrenadores/as), para elegir quién da cada clase.
// Si todavía no existe la columna en la base de datos, devuelve una lista vacía.
export async function coachesDisponibles(): Promise<Coach[]> {
  const { data } = await createAdminClient().from("profiles").select("id, nombre, apellidos").eq("es_coach", true).neq("rol", "archivado").order("nombre");
  return ((data ?? []) as { id: string; nombre: string | null; apellidos: string | null }[]).map((p) => ({
    id: p.id,
    nombre: [p.nombre, p.apellidos ? `${p.apellidos.charAt(0)}.` : ""].filter(Boolean).join(" ") || "Coach",
  }));
}
