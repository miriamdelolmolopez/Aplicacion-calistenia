"use server";

import { enviarCorreo } from "@/lib/email";
import { correoRecuperacion } from "@/lib/plantillas-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";

// Para no mandar el correo muchas veces seguidas a la misma dirección (solo vale mientras el servidor sigue encendido).
const ultimoEnvio = new Map<string, number>();

// "enviado": se ha hecho el envío (o el correo no existe: por seguridad no se dice cuál de las dos).
// "espera": acaba de pedir uno hace menos de un minuto. "fallo": el correo no ha salido de verdad (se le avisa para que no se quede esperando).
export type ResultadoRecuperacion = { ok: true; estado: "enviado" | "espera" | "fallo" };

// Manda el enlace para elegir contraseña. Si el correo no existe contesta lo mismo que si existiera (para no dar pistas),
// pero si el envío falla de verdad o pide otro demasiado pronto, lo dice.
export async function pedirRecuperacion(correo: string, idioma: "es" | "en"): Promise<ResultadoRecuperacion> {
  const email = String(correo ?? "").trim().toLowerCase();
  if (!emailValido(email)) return { ok: true, estado: "enviado" };
  const antes = ultimoEnvio.get(email) ?? 0;
  if (Date.now() - antes < 60_000) return { ok: true, estado: "espera" };
  ultimoEnvio.set(email, Date.now());

  try {
    const admin = createAdminClient();
    const { data: perfiles } = await admin.from("profiles").select("rol").ilike("email", email).limit(1);
    const perfil = perfiles?.[0];
    if (!perfil || perfil.rol === "archivado") {
      console.info("[recuperar] no se envía: no hay ficha activa con ese correo");
      return { ok: true, estado: "enviado" };
    }
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data?.properties?.hashed_token) {
      console.warn("[recuperar] no se pudo crear el enlace: %s", error?.message ?? "sin token");
      ultimoEnvio.delete(email);
      return { ok: true, estado: "fallo" };
    }
    const enviado = await enviarCorreo(correoRecuperacion({ para: email, idioma: idioma === "en" ? "en" : "es", ruta: `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery` }));
    if (!enviado) {
      ultimoEnvio.delete(email);
      return { ok: true, estado: "fallo" };
    }
  } catch (e) {
    console.warn("[recuperar] fallo inesperado: %s", String(e));
    ultimoEnvio.delete(email);
    return { ok: true, estado: "fallo" };
  }
  return { ok: true, estado: "enviado" };
}
