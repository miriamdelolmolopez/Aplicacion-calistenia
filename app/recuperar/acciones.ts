"use server";

import { enviarCorreo } from "@/lib/email";
import { correoRecuperacion } from "@/lib/plantillas-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";

// Para no mandar el correo muchas veces seguidas a la misma dirección (solo vale mientras el servidor sigue encendido).
const ultimoEnvio = new Map<string, number>();

// Manda el enlace para elegir contraseña. Siempre contesta lo mismo, exista o no el correo.
export async function pedirRecuperacion(correo: string): Promise<{ ok: true }> {
  const email = String(correo ?? "").trim().toLowerCase();
  if (!emailValido(email)) return { ok: true };
  const antes = ultimoEnvio.get(email) ?? 0;
  if (Date.now() - antes < 60_000) return { ok: true };
  ultimoEnvio.set(email, Date.now());

  try {
    const admin = createAdminClient();
    const { data: perfil } = await admin.from("profiles").select("rol").ilike("email", email).maybeSingle();
    if (!perfil || perfil.rol === "archivado") return { ok: true };
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data?.properties?.hashed_token) return { ok: true };
    await enviarCorreo(correoRecuperacion({ para: email, ruta: `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery` }));
  } catch {
    // Si falla, se contesta igual para no dar pistas.
  }
  return { ok: true };
}
