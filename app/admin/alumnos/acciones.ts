"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type Resultado = { ok: boolean; mensaje?: string };

const CAMPOS = ["reps", "segundos", "peso_kg", "distancia_m"];

export async function crearObjetivo(datos: {
  userId: string;
  ejercicioId: string;
  campo: string;
  meta: number;
}): Promise<Resultado> {
  await requireAdmin();
  if (!CAMPOS.includes(datos.campo)) return { ok: false, mensaje: "Dato no válido." };
  if (!Number.isFinite(datos.meta) || datos.meta <= 0) {
    return { ok: false, mensaje: "La meta tiene que ser un número mayor que 0." };
  }

  const admin = createAdminClient();
  const { data: ejercicio } = await admin
    .from("ejercicios")
    .select("id, nombre")
    .eq("id", datos.ejercicioId)
    .maybeSingle();
  if (!ejercicio) return { ok: false, mensaje: "No se ha encontrado el ejercicio." };

  const { data: persona } = await admin.from("profiles").select("rol").eq("id", datos.userId).maybeSingle();
  if (!persona || persona.rol === "admin") return { ok: false, mensaje: "No se ha encontrado a la alumna." };

  const { error } = await admin.from("objetivos").insert({
    user_id: datos.userId,
    ejercicio_id: ejercicio.id,
    nombre_ejercicio: ejercicio.nombre,
    campo: datos.campo,
    meta: datos.meta,
  });
  if (error) return { ok: false, mensaje: "No se ha podido guardar el objetivo." };

  revalidatePath(`/admin/alumnos/${datos.userId}`);
  return { ok: true };
}

export async function borrarObjetivo(id: string, userId: string): Promise<Resultado> {
  await requireAdmin();
  const { error } = await createAdminClient().from("objetivos").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, mensaje: "No se ha podido borrar el objetivo." };
  revalidatePath(`/admin/alumnos/${userId}`);
  return { ok: true };
}
