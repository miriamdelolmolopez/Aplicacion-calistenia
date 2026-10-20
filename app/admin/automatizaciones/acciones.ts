"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const CLAVES = ["prueba_recordatorio", "prueba_despues", "bono_caduca", "cumple"];

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

// Guarda el interruptor, los días (solo el bono) y los textos de una automatización.
export async function guardarAutomatizacion(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const clave = texto(formData, "clave");
  if (!CLAVES.includes(clave)) return { error: "Automatización no válida." };

  const campos = {
    asunto_es: texto(formData, "asunto_es"),
    mensaje_es: texto(formData, "mensaje_es"),
    asunto_en: texto(formData, "asunto_en"),
    mensaje_en: texto(formData, "mensaje_en"),
  };
  if (Object.values(campos).some((c) => c.length < 3)) return { error: "Rellena el asunto y el mensaje en español y en inglés." };
  if (campos.asunto_es.length > 150 || campos.asunto_en.length > 150) return { error: "El asunto es demasiado largo (máximo 150 letras)." };
  if (campos.mensaje_es.length > 3000 || campos.mensaje_en.length > 3000) return { error: "El mensaje es demasiado largo." };

  const cambios: Record<string, unknown> = { ...campos, activa: formData.get("activa") === "on", actualizado_en: new Date().toISOString() };
  if (clave === "bono_caduca") {
    const dias = Number(texto(formData, "dias"));
    if (!Number.isInteger(dias) || dias < 1 || dias > 60) return { error: "Los días de antelación van de 1 a 60." };
    cambios.dias = dias;
  }

  const { error } = await createAdminClient().from("automatizaciones").update(cambios).eq("clave", clave);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath("/admin/automatizaciones");
  return { mensaje: "Guardado." };
}

export async function marcarRegaloHecho(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = texto(formData, "id");
  if (!id) return;
  await createAdminClient().from("regalos").update({ estado: "hecho" }).eq("id", id).eq("tipo", "videollamada");
  revalidatePath("/admin/automatizaciones");
}
