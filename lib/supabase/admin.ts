import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave secreta: puede crear cuentas y saltarse las reglas de acceso.
// "server-only" hace que la app falle al compilar si algo del navegador lo importa.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
