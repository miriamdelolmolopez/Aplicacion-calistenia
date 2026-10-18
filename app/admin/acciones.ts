"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";

export type Estado = { error?: string; mensaje?: string; enlace?: string };

const SERVICIOS = ["grupal", "individual", "online"] as const;

function serviciosDe(formData: FormData): string[] {
  return formData
    .getAll("servicios")
    .map(String)
    .filter((s) => (SERVICIOS as readonly string[]).includes(s));
}

// Dirección de la app (para construir el enlace que se manda por WhatsApp).
async function origen(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

async function guardarServicios(userId: string, servicios: string[]) {
  const admin = createAdminClient();
  await admin.from("perfil_servicios").delete().eq("user_id", userId);
  if (servicios.length > 0) {
    await admin
      .from("perfil_servicios")
      .insert(servicios.map((servicio) => ({ user_id: userId, servicio })));
  }
}

// Alta de un alumno nuevo: crea la cuenta, le da el tipo "alumno" y sus servicios,
// y devuelve un enlace personal para que elija su contraseña.
export async function altaAlumno(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const servicios = serviciosDe(formData);
  if (!emailValido(correo)) return { error: "El correo no es válido." };
  if (servicios.length === 0) return { error: "Marca al menos un servicio." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: correo,
  });

  if (error || !data.user) {
    const yaExiste = error?.message?.toLowerCase().includes("already");
    return {
      error: yaExiste
        ? "Ese correo ya tiene cuenta. Búscalo en la lista y cámbialo a alumno."
        : "No se ha podido crear la cuenta. Inténtalo de nuevo.",
    };
  }

  // El perfil se crea solo como "invitado": aquí se sube a "alumno".
  const { error: falloRol } = await admin
    .from("profiles")
    .update({ rol: "alumno" })
    .eq("id", data.user.id);
  if (falloRol) return { error: "La cuenta se creó, pero no se pudo asignar el tipo." };

  await guardarServicios(data.user.id, servicios);
  revalidatePath("/admin");

  const base = await origen();
  return {
    mensaje: `Alta hecha para ${correo}. Envíale este enlace (por ejemplo por WhatsApp):`,
    enlace: `${base}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`,
  };
}

// Cambia el tipo (alumno / invitado) y los servicios de una persona ya registrada.
export async function cambiarPersona(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const rol = String(formData.get("rol") ?? "");
  const servicios = rol === "alumno" ? serviciosDe(formData) : [];
  if (rol !== "alumno" && rol !== "invitado") return { error: "Tipo no válido." };
  if (rol === "alumno" && servicios.length === 0) {
    return { error: "Un alumno necesita al menos un servicio." };
  }
  if (userId === user.id) return { error: "No puedes cambiar tu propia cuenta." };

  const admin = createAdminClient();
  const { data: destino } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();
  if (!destino) return { error: "No se ha encontrado a esa persona." };
  if (destino.rol === "admin") return { error: "No se puede cambiar a una administradora." };

  const { error } = await admin.from("profiles").update({ rol }).eq("id", userId);
  if (error) return { error: "No se ha podido guardar." };

  await guardarServicios(userId, servicios);
  revalidatePath("/admin");
  return { mensaje: "Cambios guardados." };
}

// Enlace nuevo para que una persona elija contraseña (alta caducada u olvido).
export async function enlaceNuevo(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  if (!emailValido(correo)) return { error: "El correo no es válido." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: correo,
  });
  if (error || !data.properties) {
    return { error: "No se ha podido generar el enlace." };
  }

  const base = await origen();
  return {
    mensaje: "Enlace nuevo listo. Envíaselo por WhatsApp:",
    enlace: `${base}/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery`,
  };
}
