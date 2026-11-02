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
// Con la sección (por ejemplo "tarifas") también comprueba que esa administradora no la tenga excluida:
// así las exclusiones se cumplen en el servidor, no solo escondiendo botones.
export async function requireAdmin(seccion?: string) {
  const supabase = await createClient();
  // Se verifica la firma del token en el propio servidor (más rápido que preguntar a Supabase).
  const { data: datosSesion } = await supabase.auth.getClaims();
  const claims = datosSesion?.claims;
  if (!claims?.sub) redirect("/entrar");
  const user = { id: claims.sub as string, email: (claims.email as string | undefined) ?? null };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, excluidos_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.rol !== "admin") redirect("/inicio");
  if (seccion && ((perfil.excluidos_admin as string[] | null) ?? []).includes(seccion)) redirect("/admin");

  return { supabase, user };
}
