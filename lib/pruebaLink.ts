import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Link de prueba gratuita: un código y un interruptor, guardados en los ajustes de la app.
// Letras y números sin los que se confunden (0/O, 1/I).
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigo(largo = 8): string {
  let c = "";
  for (let i = 0; i < largo; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return c;
}

export async function estadoLinkPrueba(): Promise<{ activo: boolean; codigo: string | null }> {
  const { data } = await createAdminClient().from("ajustes").select("clave, valor").in("clave", ["prueba_activa", "prueba_codigo"]);
  const v = (clave: string) => data?.find((a) => a.clave === clave)?.valor ?? null;
  return { activo: v("prueba_activa") === "true", codigo: v("prueba_codigo") };
}

// ¿El código del enlace es el vigente y el link está activado?
export async function codigoValido(codigo: string | undefined): Promise<boolean> {
  if (!codigo) return false;
  const { activo, codigo: vigente } = await estadoLinkPrueba();
  return activo && !!vigente && codigo.trim().toUpperCase() === vigente;
}
