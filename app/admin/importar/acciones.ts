"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { enviarCorreo } from "@/lib/email";
import { CORREO_VALIDO, type FilaImport } from "@/lib/importar";
import { correoInvitacion } from "@/lib/plantillas-email";
import { invitar } from "@/lib/registro";
import { createAdminClient } from "@/lib/supabase/admin";

const SERVICIOS = ["grupal", "individual", "online", "taller"];

export type ResultadoFila = { correo: string; ok: boolean; mensaje: string; enlace?: string };

// De estos correos, los que ya tienen cuenta (para no duplicarlos).
export async function correosConCuenta(correos: string[]): Promise<string[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const existentes: string[] = [];
  for (let i = 0; i < correos.length; i += 100) {
    const lote = correos.slice(i, i + 100);
    const { data } = await admin.from("profiles").select("email").in("email", lote);
    for (const p of data ?? []) if (p.email) existentes.push(String(p.email).toLowerCase());
  }
  return existentes;
}

// Crea las cuentas de un grupo pequeño de personas y les manda su invitación (si se pide). Se llama por tandas desde la pantalla.
export async function importarLote(filas: FilaImport[], enviar: boolean): Promise<ResultadoFila[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const resultados: ResultadoFila[] = [];
  for (const f of filas.slice(0, 10)) {
    const correo = String(f.correo ?? "").trim().toLowerCase();
    if (!CORREO_VALIDO.test(correo)) {
      resultados.push({ correo, ok: false, mensaje: "El correo no es válido." });
      continue;
    }
    const tipo = f.tipo === "invitado" ? "invitado" : "alumno";
    const servicios = tipo === "alumno" ? [...new Set((f.servicios ?? []).filter((s) => SERVICIOS.includes(s)))] : [];

    const { data: existente } = await admin.from("profiles").select("id").eq("email", correo).maybeSingle();
    if (existente) {
      resultados.push({ correo, ok: false, mensaje: "Ya tiene cuenta." });
      continue;
    }

    const { data, error } = await invitar(correo);
    if (error || !data.user) {
      resultados.push({ correo, ok: false, mensaje: "No se ha podido crear la cuenta." });
      continue;
    }
    const id = data.user.id;
    await admin
      .from("profiles")
      .update({ rol: tipo, nombre: f.nombre?.trim().slice(0, 80) || null, apellidos: f.apellidos?.trim().slice(0, 120) || null, telefono: f.telefono?.trim().slice(0, 30) || null })
      .eq("id", id);
    await admin.from("perfil_servicios").delete().eq("user_id", id);
    if (servicios.length > 0) await admin.from("perfil_servicios").insert(servicios.map((servicio) => ({ user_id: id, servicio })));

    const ruta = `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`;
    let mensaje = "Cuenta creada.";
    if (enviar) {
      const ok = await enviarCorreo(correoInvitacion({ para: correo, alumno: tipo === "alumno", ruta }));
      mensaje = ok ? "Cuenta creada e invitación enviada." : "Cuenta creada, pero no se pudo enviar el correo: manda el enlace por WhatsApp.";
      resultados.push({ correo, ok: true, mensaje, enlace: ok ? undefined : `${protocolo}://${host}${ruta}` });
    } else {
      resultados.push({ correo, ok: true, mensaje: "Cuenta creada (sin invitación).", enlace: `${protocolo}://${host}${ruta}` });
    }
  }

  revalidatePath("/admin/usuarios");
  return resultados;
}
