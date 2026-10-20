import "server-only";
import { createAdminClient } from "./supabase/admin";

export type FormaPago = { clave: string; nombre: string; activa: boolean; orden: number };

// Todas las formas de pago, en el orden que ha elegido Miriam.
export async function todasLasFormas(): Promise<FormaPago[]> {
  const { data } = await createAdminClient().from("formas_pago").select("clave, nombre, activa, orden").order("orden").order("nombre");
  return (data ?? []) as FormaPago[];
}

// Las que se pueden elegir al cobrar (las desactivadas no salen).
export async function formasActivas(): Promise<{ clave: string; nombre: string }[]> {
  return (await todasLasFormas()).filter((f) => f.activa).map(({ clave, nombre }) => ({ clave, nombre }));
}

// Nombre para enseñar en pagos e informes. Si una forma ya no existe, se enseña su clave.
export async function nombresFormas(): Promise<Record<string, string>> {
  return Object.fromEntries((await todasLasFormas()).map((f) => [f.clave, f.nombre]));
}

export async function formaActiva(clave: string): Promise<boolean> {
  const { data } = await createAdminClient().from("formas_pago").select("activa").eq("clave", clave).maybeSingle();
  return !!data?.activa;
}
