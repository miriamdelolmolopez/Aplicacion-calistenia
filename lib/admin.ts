import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Las secciones del panel que la administradora actual tiene excluidas (vacío si no hay ninguna o no es administradora).
export async function seccionesExcluidas(): Promise<string[]> {
  const supabase = await createClient();
  const { data: datosSesion } = await supabase.auth.getClaims();
  const id = datosSesion?.claims?.sub as string | undefined;
  if (!id) return [];
  const { data } = await supabase.from("profiles").select("excluidos_admin").eq("id", id).maybeSingle();
  return ((data?.excluidos_admin as string[] | null) ?? []).filter(Boolean);
}

// Comprueba en el servidor que quien llama es administradora.
// Se usa al principio de cada página y de cada acción de /admin.
export async function requireAdmin() {
  const supabase = await createClient();
  // Se verifica la firma del token en el propio servidor (más rápido que preguntar a Supabase).
  const { data: datosSesion } = await supabase.auth.getClaims();
  const claims = datosSesion?.claims;
  if (!claims?.sub) redirect("/entrar");
  const user = { id: claims.sub as string, email: (claims.email as string | undefined) ?? null };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.rol !== "admin") redirect("/inicio");

  return { supabase, user };
}
