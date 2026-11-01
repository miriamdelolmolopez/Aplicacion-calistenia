"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CLAVES_NUEVAS, PLANTILLAS, type ClavePlantilla } from "@/lib/plantillasAutomatizacion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const CLAVES: string[] = ["prueba_recordatorio", "prueba_despues", "bono_caduca", "cumple", ...CLAVES_NUEVAS];

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
  if (clave === "bono_caduca" || clave === "echamos_menos") {
    const dias = Number(texto(formData, "dias"));
    if (!Number.isInteger(dias) || dias < 1 || dias > 60) return { error: "Los días van de 1 a 60." };
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

// «Nueva»: añade una plantilla de la lista. Nace apagada, para que veas a quién le llegaría antes de activarla.
export async function crearAutomatizacion(clave: string): Promise<Estado> {
  await requireAdmin();
  const p = PLANTILLAS.find((x) => x.clave === (clave as ClavePlantilla));
  if (!p) return { error: "Esa plantilla no existe." };

  const admin = createAdminClient();
  const { data: existe } = await admin.from("automatizaciones").select("clave").eq("clave", p.clave).maybeSingle();
  if (existe) return { error: "Esa automatización ya está añadida." };

  const ahora = new Date().toISOString();
  const { error } = await admin.from("automatizaciones").insert({
    clave: p.clave,
    activa: false,
    dias: p.dias?.defecto ?? 1,
    asunto_es: p.asunto_es,
    mensaje_es: p.mensaje_es,
    asunto_en: p.asunto_en,
    mensaje_en: p.mensaje_en,
  });
  if (error) return { error: "No se ha podido añadir." };
  // Desde cuándo existe: así la bienvenida no llega a quien se dio de alta antes.
  await admin.from("ajustes").upsert({ clave: `auto_desde_${p.clave}`, valor: ahora, actualizado_en: ahora });

  revalidatePath("/admin/automatizaciones");
  return { mensaje: `«${p.titulo}» añadida. Está apagada: revisa el texto y actívala cuando quieras.` };
}
