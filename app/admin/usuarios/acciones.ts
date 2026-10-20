"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { enviarCorreo } from "@/lib/email";
import { correoInvitacion } from "@/lib/plantillas-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";
import { headers } from "next/headers";
import type { Estado } from "../acciones";

// Notas privadas de Miriam sobre una persona (nadie más las ve).
export async function guardarNota(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const texto = String(formData.get("texto") ?? "").slice(0, 4000);

  const { error } = await createAdminClient()
    .from("notas_usuario")
    .upsert({ user_id: userId, texto, actualizado_en: new Date().toISOString() });
  if (error) return { error: "No se ha podido guardar la nota." };

  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: "Nota guardada." };
}

const SERVICIOS_VALIDOS = ["grupal", "individual", "online"];

// Crea a una persona nueva desde «+» en Usuarios.
// Invitada: se le manda un correo con el enlace para crear su cuenta.
// Alumna: se crea su cuenta con sus servicios y, si se elige, su bono (con el pago hecho o pendiente);
// se le manda el correo para elegir contraseña y también se devuelve el enlace (por si prefieres WhatsApp).
export async function crearUsuario(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const tipo = String(formData.get("tipo") ?? "");
  if (!emailValido(correo)) return { error: "El correo no es válido." };
  if (tipo !== "invitado" && tipo !== "alumno") return { error: "Elige si es invitada o alumna." };

  const admin = createAdminClient();
  const { data: existente } = await admin.from("profiles").select("id").ilike("email", correo).maybeSingle();
  if (existente) return { error: "Ese correo ya tiene cuenta. Búscalo en la lista." };

  if (tipo === "invitado") {
    const enviado = await enviarCorreo(correoInvitacion({ para: correo, alumno: false, ruta: "/registro" }));
    return enviado
      ? { mensaje: `Invitación enviada a ${correo}. Cuando cree su cuenta aparecerá en la lista.` }
      : { error: "No se ha podido enviar el correo. Inténtalo de nuevo." };
  }

  // Alumna
  let servicios = formData.getAll("servicios").map(String).filter((s) => SERVICIOS_VALIDOS.includes(s));
  const tarifa = String(formData.get("tarifa") ?? "");
  const pagoAhora = String(formData.get("pago") ?? "luego") === "ahora";
  const metodo = String(formData.get("metodo") ?? "");
  if (tarifa && !["efectivo", "bizum", "transferencia"].includes(metodo)) return { error: "Elige cómo paga." };

  let servicioTarifa: string | null = null;
  if (tarifa) {
    const { data: t } = await admin.from("tipos_bono").select("servicio").eq("id", tarifa).eq("activo", true).maybeSingle();
    if (!t) return { error: "La tarifa elegida no es válida." };
    servicioTarifa = t.servicio as string;
    if (!servicios.includes(servicioTarifa)) servicios = [...servicios, servicioTarifa];
  }
  if (servicios.length === 0) return { error: "Marca al menos un servicio (o elige una tarifa)." };

  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email: correo });
  if (error || !data.user) return { error: "No se ha podido crear la cuenta. Inténtalo de nuevo." };

  const { error: falloRol } = await admin.from("profiles").update({ rol: "alumno" }).eq("id", data.user.id);
  if (falloRol) return { error: "La cuenta se creó, pero no se pudo asignar el tipo." };

  await admin.from("perfil_servicios").delete().eq("user_id", data.user.id);
  await admin.from("perfil_servicios").insert(servicios.map((servicio) => ({ user_id: data.user!.id, servicio })));

  let avisoBono = "";
  if (tarifa) {
    const { error: falloBono } = await admin.rpc("crear_bono", {
      p_user: data.user.id,
      p_tipo: tarifa,
      p_metodo: metodo,
      p_pagado: pagoAhora,
      p_nota: "",
      p_admin: user.id,
      p_descuento: null,
    });
    avisoBono = falloBono
      ? " La cuenta está creada, pero el bono no se pudo registrar: hazlo en Bonos y pagos."
      : pagoAhora
        ? " Bono registrado y cobrado."
        : " Bono registrado: ya puede reservar y el pago queda pendiente de cobrar.";
  }

  const ruta = `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`;
  const enviado = await enviarCorreo(correoInvitacion({ para: correo, alumno: true, ruta }));

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    mensaje: `Alumna creada (${correo}).${avisoBono} ${enviado ? "Le hemos enviado el correo para elegir su contraseña. Si prefieres, también puedes mandarle este enlace por WhatsApp:" : "No se pudo enviar el correo: mándale este enlace por WhatsApp:"}`,
    enlace: `${protocolo}://${host}${ruta}`,
  };
}
