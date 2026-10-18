"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
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
