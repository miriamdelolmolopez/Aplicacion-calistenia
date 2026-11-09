import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Nombres que la administradora ha puesto a las tarjetas de Administración (clave: la dirección, por ejemplo «/admin/ejercicios»).
export async function obtenerNombresAdmin(): Promise<Record<string, string>> {
  try {
    const { data } = await createAdminClient().from("ajustes").select("valor").eq("clave", "nombres_admin").maybeSingle();
    const crudo = JSON.parse(String(data?.valor ?? "{}")) as Record<string, unknown>;
    const limpio: Record<string, string> = {};
    for (const [k, v] of Object.entries(crudo)) if (typeof v === "string" && v.trim()) limpio[k] = v.slice(0, 60);
    return limpio;
  } catch {
    return {};
  }
}
