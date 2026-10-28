"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoFrase = { ok: boolean; error?: string };

function limpiar(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim();
}

function repasar() {
  revalidatePath("/admin");
  revalidatePath("/admin/contenido");
  revalidatePath("/inicio");
}

export async function guardarFrase(formData: FormData): Promise<ResultadoFrase> {
  await requireAdmin();
  const id = limpiar(formData.get("id"));
  const es = limpiar(formData.get("texto_es"));
  const en = limpiar(formData.get("texto_en"));
  const activa = formData.get("activa") === "on";
  if (!es || !en || es.length > 140 || en.length > 140) {
    return { ok: false, error: "Escribe la frase en español y en inglés (máximo 140 letras)." };
  }

  const admin = createAdminClient();
  const { error } = id
    ? await admin.from("frases_inicio").update({ texto_es: es, texto_en: en, activa }).eq("id", id)
    : await admin.from("frases_inicio").insert({ texto_es: es, texto_en: en, activa });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  repasar();
  return { ok: true };
}

export async function activarFrase(id: string, activa: boolean): Promise<ResultadoFrase> {
  await requireAdmin();
  const { error } = await createAdminClient().from("frases_inicio").update({ activa }).eq("id", id);
  if (error) return { ok: false, error: "No se ha podido cambiar." };
  repasar();
  return { ok: true };
}

export async function borrarFrase(id: string): Promise<ResultadoFrase> {
  await requireAdmin();
  const { error } = await createAdminClient().from("frases_inicio").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar." };
  repasar();
  return { ok: true };
}

// Copia una frase (queda desactivada hasta que la cambies).
export async function duplicarFrase(id: string): Promise<ResultadoFrase> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: o } = await admin.from("frases_inicio").select("texto_es, texto_en").eq("id", id).maybeSingle();
  if (!o) return { ok: false, error: "No se ha encontrado la frase." };
  const { error } = await admin.from("frases_inicio").insert({ texto_es: o.texto_es, texto_en: o.texto_en, activa: false });
  if (error) return { ok: false, error: "No se ha podido duplicar." };
  repasar();
  return { ok: true };
}
