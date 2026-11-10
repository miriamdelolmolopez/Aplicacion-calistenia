"use server";

import { comoVisto } from "@/lib/como";
import { createAdminClient } from "@/lib/supabase/admin";

// Al mirar como otra persona, se comprueba su plan online igual que se comprueba el de ella (tarifa activa y pagada).
// Así ves lo mismo que ve ella: si no tiene el plan activo, tampoco lo ves tú.
export async function planOnlineComo(id: string): Promise<boolean> {
  if ((await comoVisto()) !== id) return false;
  const { data } = await createAdminClient().rpc("tiene_plan_online", { p_user: id });
  return data === true;
}
