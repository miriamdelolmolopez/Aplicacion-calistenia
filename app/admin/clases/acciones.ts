"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function entero(valor: FormDataEntryValue | null): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : NaN;
}

// Crea las clases de las próximas semanas a partir del horario semanal.
export async function generarClases(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const semanas = entero(formData.get("semanas"));
  if (!(semanas >= 1 && semanas <= 12)) return { error: "Elige entre 1 y 12 semanas." };

  const { data, error } = await createAdminClient().rpc("generar_clases", { semanas });
  if (error) return { error: "No se han podido crear las clases." };

  revalidatePath("/admin/clases");
  return {
    mensaje:
      data === 0
        ? "Ya estaban creadas todas las clases de esas semanas."
        : `Se han creado ${data} clases nuevas.`,
  };
}

export async function cambiarPlazas(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const plazas = entero(formData.get("plazas"));
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };

  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ plazas })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Plazas guardadas." };
}

// Por ahora solo marca la clase como cancelada. La devolución de clases y la
// ampliación del bono por lluvia se añaden cuando existan los bonos y reservas.
export async function cancelarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 200);

  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ estado: "cancelada", motivo_cancelacion: motivo || null })
    .eq("id", id);
  if (error) return { error: "No se ha podido cancelar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Clase cancelada." };
}

export async function reactivarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ estado: "programada", motivo_cancelacion: null })
    .eq("id", id);
  if (error) return { error: "No se ha podido reactivar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Clase reactivada." };
}

// Plazas por defecto y mínimo de alumnos de cada tipo de clase.
export async function cambiarTipo(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("tipoId") ?? "");
  const plazas = entero(formData.get("plazas_max"));
  const minimo = entero(formData.get("minimo_alumnos"));
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(minimo >= 0 && minimo <= plazas)) {
    return { error: "El mínimo no puede ser mayor que las plazas." };
  }

  const { error } = await createAdminClient()
    .from("tipos_clase")
    .update({ plazas_max: plazas, minimo_alumnos: minimo })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Guardado. Las clases nuevas usarán estas plazas." };
}
