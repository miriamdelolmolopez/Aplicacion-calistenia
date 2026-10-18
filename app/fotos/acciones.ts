"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type FotosApp = {
  portada: string | null;
  inicio: string | null;
  tipos: Record<string, string>; // nombre del tipo de clase → foto
};

// Fotos que Miriam ha puesto desde Administración. Son públicas (no son fotos de personas),
// así que también las ve quien aún no ha entrado en la portada.
export async function obtenerFotosApp(): Promise<FotosApp> {
  const admin = createAdminClient();
  const [{ data: sueltas }, { data: tipos }] = await Promise.all([
    admin.from("fotos_app").select("clave, url"),
    admin.from("tipos_clase").select("nombre, foto_url").not("foto_url", "is", null),
  ]);
  const por = (clave: string) => sueltas?.find((f) => f.clave === clave)?.url ?? null;
  return {
    portada: por("portada"),
    inicio: por("inicio"),
    tipos: Object.fromEntries((tipos ?? []).map((t) => [t.nombre, t.foto_url as string])),
  };
}
