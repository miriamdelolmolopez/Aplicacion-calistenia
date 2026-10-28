"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { enviarCorreo } from "@/lib/email";
import { correoInvitacion } from "@/lib/plantillas-email";
import { instanteMadrid, sumarDias } from "@/lib/fechas";
import { formaActiva } from "@/lib/formasPago";
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

// Fecha de inicio de un bono que la alumna ya tenía empezado (pasada o de hoy, y no de hace más de dos años).
function inicioValido(fecha: string): boolean {
  const d = instanteMadrid(fecha, "00:00");
  if (!d) return false;
  const ahora = Date.now();
  return d.getTime() <= ahora && d.getTime() >= ahora - 730 * 86_400_000;
}

// Pone la fecha en que empezó el bono (y la de caducidad que le corresponde). Vale también para el segundo bono de un combo.
async function fijarInicioBono(admin: ReturnType<typeof createAdminClient>, bonoId: string, fecha: string) {
  const desde = instanteMadrid(fecha, "00:00");
  if (!desde) return;
  const { data: base } = await admin.from("bonos").select("user_id, tipo_bono_id, creado_en").eq("id", bonoId).maybeSingle();
  if (!base) return;
  const { data: bonos } = await admin.from("bonos").select("id, validez_dias").eq("user_id", base.user_id).eq("tipo_bono_id", base.tipo_bono_id).eq("creado_en", base.creado_en);
  for (const b of bonos ?? []) {
    // Se cuenta por días de calendario (en hora de Madrid), para que el cambio de hora no la mueva un día.
    const caduca = instanteMadrid(sumarDias(fecha, b.validez_dias as number), "00:00") ?? desde;
    await admin.from("bonos").update({ activo_desde: desde.toISOString(), caduca_en: caduca.toISOString() }).eq("id", b.id);
  }
  await admin.rpc("refrescar_bonos", { p_user: base.user_id });
}

// Cambia la fecha en que empezó un bono que ya existe.
export async function cambiarInicioBono(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const bonoId = String(formData.get("bonoId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const fecha = String(formData.get("inicio") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(bonoId) || !inicioValido(fecha)) return { error: "La fecha de inicio no es válida (no puede ser futura)." };
  await fijarInicioBono(createAdminClient(), bonoId, fecha);
  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: "Fecha de inicio cambiada. La caducidad se ha recalculado." };
}

// Registra una clase que la alumna YA hizo (fecha pasada): descuenta una clase de su bono y queda como «asistió».
export async function registrarClaseHecha(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(tipo)) return { error: "Elige el tipo de clase." };
  const empieza = instanteMadrid(fecha, hora);
  if (!empieza) return { error: "Escribe el día y la hora de la clase." };
  if (empieza.getTime() > Date.now()) return { error: "La clase tiene que ser de una fecha pasada. Para las próximas usa Reservar." };

  const { error } = await createAdminClient().rpc("registrar_clase_hecha", { p_user: userId, p_tipo: tipo, p_empieza: empieza.toISOString(), p_admin: user.id });
  if (error) return { error: error.message };

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/reservas");
  return { mensaje: "Clase registrada. Se ha descontado una clase de su bono y no se le ha avisado." };
}

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
  if (tarifa && !(await formaActiva(metodo))) return { error: "Elige cómo paga." };

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

  const inicio = String(formData.get("inicio") ?? "").trim();
  if (tarifa && inicio && !inicioValido(inicio)) return { error: "La fecha de inicio del bono no es válida (no puede ser futura)." };

  let avisoBono = "";
  if (tarifa) {
    const { data: bonoNuevo, error: falloBono } = await admin.rpc("crear_bono", {
      p_user: data.user.id,
      p_tipo: tarifa,
      p_metodo: metodo,
      p_pagado: pagoAhora,
      p_nota: "",
      p_admin: user.id,
      p_descuento: null,
    });
    if (!falloBono && inicio && bonoNuevo) await fijarInicioBono(admin, bonoNuevo as string, inicio);
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

// Elimina a una persona y todos sus datos (los pagos se conservan: la base de datos les guarda su nombre y DNI).
export async function eliminarUsuario(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "Persona no válida." };
  if (userId === user.id) return { ok: false, error: "No puedes eliminar tu propia cuenta." };

  const admin = createAdminClient();
  const { data: persona } = await admin.from("profiles").select("rol, foto_path").eq("id", userId).maybeSingle();
  if (!persona) return { ok: false, error: "No se ha encontrado a esa persona." };
  if (persona.rol === "admin") return { ok: false, error: "No se puede eliminar a una administradora." };

  if (persona.foto_path) await admin.storage.from("avatares").remove([persona.foto_path as string]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "No se ha podido eliminar. Inténtalo de nuevo." };

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/personas");
  return { ok: true };
}
