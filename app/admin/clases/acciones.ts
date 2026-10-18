"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function entero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim();
  if (texto === "") return 0;
  const n = Number(texto);
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

// Cancela la clase, devuelve su clase a todos los apuntados y amplía su bono
// los días indicados (0 = sin ampliar).
export async function cancelarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 200);
  const dias = entero(formData.get("dias"));
  if (!(dias >= 0 && dias <= 60)) return { error: "Los días de ampliación van de 0 a 60." };

  const { data, error } = await createAdminClient().rpc("cancelar_clase", {
    p_sesion: id,
    p_motivo: motivo,
    p_dias: dias,
    p_admin: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/clases");
  const personas = Number(data ?? 0);
  return {
    mensaje:
      `Clase cancelada. Se ha devuelto la clase a ${personas} ${personas === 1 ? "persona" : "personas"}` +
      (dias > 0 && personas > 0 ? ` y se han ampliado sus bonos ${dias} días.` : "."),
  };
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
  return {
    mensaje:
      "Clase reactivada. Las reservas anteriores no se recuperan: se les devolvió su clase.",
  };
}

// Apunta a un alumno a una clase (usa su bono; puede saltarse el límite de antelación).
export async function apuntarAlumno(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const persona = String(formData.get("persona") ?? "");
  if (!persona) return { error: "Elige una persona." };

  const { error } = await createAdminClient().rpc("reservar_clase", {
    p_user: persona,
    p_sesion: String(formData.get("sesionId") ?? ""),
    p_admin: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/clases");
  return { mensaje: "Alumno apuntado. Se ha descontado una clase de su bono." };
}

// Quita a alguien de una clase, devolviéndole o no la clase.
export async function quitarApuntado(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const devolver = formData.get("devolver") === "si";
  const { data, error } = await createAdminClient().rpc("cancelar_reserva", {
    p_user: user.id,
    p_reserva: String(formData.get("reservaId") ?? ""),
    p_admin: user.id,
    p_devolver: devolver,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/clases");
  return {
    mensaje: data === "devuelta" ? "Quitado. Se le ha devuelto la clase." : "Quitado sin devolver la clase.",
  };
}

// Horas de cancelación, días de antelación y si los alumnos ven a los apuntados.
export async function cambiarAjustes(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const horas = entero(formData.get("horas"));
  const dias = entero(formData.get("dias"));
  const ver = formData.get("ver") === "on";
  if (!(horas >= 0 && horas <= 72)) return { error: "Las horas de cancelación van de 0 a 72." };
  if (!(dias >= 1 && dias <= 60)) return { error: "Los días de antelación van de 1 a 60." };

  const ahora = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("ajustes")
    .upsert([
      { clave: "cancelacion_horas", valor: String(horas), actualizado_en: ahora },
      { clave: "reserva_dias_max", valor: String(dias), actualizado_en: ahora },
      { clave: "ver_apuntados", valor: ver ? "true" : "false", actualizado_en: ahora },
    ]);
  if (error) return { error: "No se han podido guardar los ajustes." };

  revalidatePath("/admin/clases");
  return { mensaje: "Ajustes guardados." };
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
  return { mensaje: "Guardado. Las clases nuevas usarán estas plazas y este mínimo." };
}
