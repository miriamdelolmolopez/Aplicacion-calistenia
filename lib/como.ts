import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// «Ver como alumno/a»: la administradora mira la app como la vería esa persona. El navegador guarda quién en la cookie «como».
// Solo vale si quien llama es administradora de verdad; para cualquier otra persona la cookie no hace nada.
export async function comoVisto(): Promise<string | null> {
  const valor = (await cookies()).get("como")?.value ?? "";
  if (!UUID.test(valor)) return null;
  const { data } = await (await createClient()).auth.getClaims();
  const yo = data?.claims?.sub;
  if (!yo) return null;
  const { data: perfil } = await createAdminClient().from("profiles").select("rol").eq("id", yo).maybeSingle();
  return perfil?.rol === "admin" ? valor : null;
}

// Mientras la administradora mira como otra persona, la app es de solo lectura: nada de reservar, cancelar ni guardar.
export async function enSoloLectura(): Promise<boolean> {
  return (await comoVisto()) !== null;
}

export const MENSAJE_SOLO_LECTURA = "Estás viendo la app como otra persona: es solo de lectura.";
