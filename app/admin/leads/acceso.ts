import "server-only";
import { requireAdmin } from "@/lib/admin";
import { duenoDeLeads } from "./datos";

// Comprueba que quien entra es administradora (con la sección Leads permitida) y devuelve también de quién son los leads (la entrenadora principal).
export async function requireLeads() {
  const acceso = await requireAdmin("leads");
  return { ...acceso, duenoId: await duenoDeLeads() };
}
