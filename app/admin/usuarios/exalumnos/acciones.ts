"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";
import type { Estado } from "../../acciones";
import { TIPOS_VALIDOS } from "./tipos";

// Añade a mano a una persona que no tiene cuenta (exalumna, invitada antigua…): sin crear cuenta y sin enviarle ningún correo.
// Puede tener varios tipos a la vez (por ejemplo, exalumna de grupal y de personal).
export async function anadirPersona(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const tipos = [...new Set(formData.getAll("tipos").map(String))].filter((t) => TIPOS_VALIDOS.includes(t));
  const bloquea = formData.get("bloquea") === "on";
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const dni = String(formData.get("dni") ?? "").trim().toUpperCase().slice(0, 20);
  const telefono = String(formData.get("telefono") ?? "").trim().slice(0, 30);
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);

  if (tipos.length === 0) return { error: "Marca al menos un tipo (qué era)." };
  if (!correo && !dni && !telefono) return { error: "Escribe al menos el correo, el DNI o el teléfono." };
  if (correo && !emailValido(correo)) return { error: "El correo no es válido." };

  const { error } = await createAdminClient()
    .from("personas_registradas")
    .insert({ nombre: nombre || null, correo: correo || null, dni: dni || null, telefono: telefono || null, nota: nota || null, origen: "manual", tipo: tipos[0], tipos, bloquea_prueba: bloquea, creado_por: user.id });
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  revalidatePath("/admin/usuarios/exalumnos");
  return { mensaje: bloquea ? "Guardada. Si se registra, no podrá hacer clase de prueba gratis." : "Guardada. Si se registra, podrá hacer su clase de prueba." };
}

// Quita a una persona del registro (por ejemplo, si lo pide por ley o se añadió por error).
export async function quitarPersona(id: string): Promise<{ ok: boolean }> {
  await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await createAdminClient().from("personas_registradas").delete().eq("id", id);
  revalidatePath("/admin/usuarios/exalumnos");
  return { ok: true };
}

// Cambia si esa persona puede o no hacer la clase de prueba gratis.
export async function cambiarBloqueo(id: string, bloquea: boolean): Promise<{ ok: boolean }> {
  await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await createAdminClient().from("personas_registradas").update({ bloquea_prueba: bloquea }).eq("id", id);
  revalidatePath("/admin/usuarios/exalumnos");
  return { ok: true };
}
