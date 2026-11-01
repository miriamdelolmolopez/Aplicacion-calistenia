import "server-only";
import { randomBytes } from "node:crypto";
import { codigoValido } from "@/lib/pruebaLink";
import { createAdminClient } from "@/lib/supabase/admin";

// ¿Está abierto el registro de la app? Si el ajuste no existe, se considera abierto (como antes).
export async function registroAbierto(): Promise<boolean> {
  const { data } = await createAdminClient().from("ajustes").select("valor").eq("clave", "registro_abierto").maybeSingle();
  return (data?.valor ?? "true") === "true";
}

// Clave interna que deja pasar las altas hechas por Miriam cuando el registro está cerrado. Solo la conoce el servidor.
async function claveAlta(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("claves_internas").select("valor").eq("clave", "alta").maybeSingle();
  if (data?.valor) return data.valor;
  const nueva = randomBytes(24).toString("hex");
  await admin.from("claves_internas").upsert({ clave: "alta", valor: nueva });
  return nueva;
}

// Da de alta a una persona por invitación (lo que hace Miriam desde Administración). Funciona aunque el registro esté cerrado.
export async function invitar(correo: string) {
  const admin = createAdminClient();
  const resultado = await admin.auth.admin.generateLink({ type: "invite", email: correo, options: { data: { alta: await claveAlta() } } });
  // La clave no se queda guardada en la cuenta.
  if (resultado.data?.user) await admin.auth.admin.updateUserById(resultado.data.user.id, { user_metadata: { alta: null } });
  return resultado;
}

// Puede crear cuenta quien llega con el registro abierto o con el código vigente del link de prueba.
export async function puedeRegistrarse(codigo: string | null | undefined): Promise<boolean> {
  return (await registroAbierto()) || (await codigoValido(codigo ?? undefined));
}
