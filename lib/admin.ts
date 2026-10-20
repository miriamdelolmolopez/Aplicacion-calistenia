import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
