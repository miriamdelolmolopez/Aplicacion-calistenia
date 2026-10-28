"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { instanteMadrid } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function refrescar() {
  revalidatePath("/admin/horario");
  revalidatePath("/admin/clases");
  revalidatePath("/clases");
}

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

function entero(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor);
  return Number.isInteger(n) ? n : NaN;
}

// Añade una clase suelta en un día y hora concretos.
export async function anadirClaseSuelta(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const tipoId = texto(formData, "tipoId");
  const inicio = instanteMadrid(texto(formData, "fecha"), texto(formData, "hora"));
  if (!inicio) return { error: "Elige el día y la hora." };
  if (inicio.getTime() <= Date.now()) return { error: "La clase tiene que ser en el futuro." };

  const admin = createAdminClient();
  const { data: tipo } = await admin
    .from("tipos_clase")
    .select("plazas_max, plazas_prueba, activo")
    .eq("id", tipoId)
    .maybeSingle();
  if (!tipo || !tipo.activo) return { error: "Elige un tipo de clase activo." };

  const plazas = entero(texto(formData, "plazas")) ?? (tipo.plazas_max as number);
  const prueba = entero(texto(formData, "plazas_prueba")) ?? Math.min(tipo.plazas_prueba as number, plazas);
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(prueba >= 0 && prueba <= plazas)) return { error: "Las plazas de prueba no pueden ser más que las plazas." };

  const { error } = await admin
    .from("sesiones_clase")
    .insert({ tipo_id: tipoId, empieza_en: inicio.toISOString(), plazas, plazas_prueba: prueba });
  if (error) {
    return { error: error.code === "23505" ? "Ya hay una clase de ese tipo a esa hora." : "No se ha podido añadir la clase." };
  }

  refrescar();
  return { mensaje: "Clase añadida." };
}

// Cambia el día y la hora de una clase. Las personas apuntadas la verán en su nueva hora.
export async function cambiarHoraClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "sesionId");
  const inicio = instanteMadrid(texto(formData, "fecha"), texto(formData, "hora"));
  if (!inicio) return { error: "Elige el día y la hora." };
  if (inicio.getTime() <= Date.now()) return { error: "La nueva hora tiene que ser en el futuro." };

  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ empieza_en: inicio.toISOString() })
    .eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "Ya hay una clase de ese tipo a esa hora." : "No se ha podido cambiar la hora." };
  }

  refrescar();
  return { mensaje: "Hora cambiada." };
}

// Aplica una plantilla de horario solo a los días elegidos.
export async function aplicarPlantillaDias(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const plantilla = texto(formData, "plantilla");
  const dias = formData.getAll("dias").map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (!plantilla) return { error: "Elige una plantilla." };
  if (dias.length === 0) return { error: "Marca al menos un día." };
  if (dias.length > 31) return { error: "Demasiados días de una vez." };

  const admin = createAdminClient();
  let creadas = 0;
  for (const dia of dias) {
    const { data, error } = await admin.rpc("crear_clases_rango", { p_plantilla: plantilla, p_desde: dia, p_hasta: dia });
    if (error) return { error: "No se han podido crear las clases." };
    creadas += Number(data ?? 0);
  }

  refrescar();
  return {
    mensaje:
      creadas === 0
        ? "No se ha creado ninguna clase: ya existían todas (o esos días ya han pasado)."
        : `Se han creado ${creadas} ${creadas === 1 ? "clase" : "clases"}. Las que ya existían no se han tocado.`,
  };
}

// Edita una clase concreta: día, hora, plazas y plazas de invitadas. Las reglas de cancelación y de
// preinscripción son del tipo de clase, así que cambian para todas las clases de ese tipo.
export async function editarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "sesionId");
  const tipoId = texto(formData, "tipoId");
  const inicio = instanteMadrid(texto(formData, "fecha"), texto(formData, "hora"));
  if (!inicio) return { error: "Elige el día y la hora." };
  const plazas = entero(texto(formData, "plazas"));
  const prueba = entero(texto(formData, "plazas_prueba")) ?? 0;
  if (plazas === null || !(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(prueba >= 0 && prueba <= plazas)) return { error: "Las plazas de invitadas no pueden ser más que las plazas." };
  const horas = entero(texto(formData, "cancelacion_horas"));
  const dias = entero(texto(formData, "reserva_dias_max"));
  if (horas !== null && !(horas >= 0 && horas <= 168)) return { error: "Las horas para cancelar van de 0 a 168 (o déjalo vacío)." };
  if (dias !== null && !(dias >= 1 && dias <= 365)) return { error: "Los días de preinscripción van de 1 a 365 (o déjalo vacío)." };

  const admin = createAdminClient();
  const { data: actual } = await admin.from("sesiones_clase").select("empieza_en, tipo_id").eq("id", id).maybeSingle();
  if (!actual) return { error: "No se ha encontrado la clase." };
  const mismaHora = new Date(actual.empieza_en as string).getTime() === inicio.getTime();
  if (!mismaHora && inicio.getTime() <= Date.now()) return { error: "La nueva hora tiene que ser en el futuro." };

  const { count: apuntadas } = await admin
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("sesion_id", id)
    .eq("estado", "reservada");
  if ((apuntadas ?? 0) > plazas) return { error: `Hay ${apuntadas} personas apuntadas: no puedes dejar menos plazas.` };

  const { error } = await admin.from("sesiones_clase").update({ empieza_en: inicio.toISOString(), plazas, plazas_prueba: prueba }).eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "Ya hay una clase de ese tipo a esa hora." : "No se ha podido guardar la clase." };
  }
  if (tipoId === actual.tipo_id) {
    const { error: eTipo } = await admin.from("tipos_clase").update({ cancelacion_horas: horas, reserva_dias_max: dias }).eq("id", tipoId);
    if (eTipo) return { error: "La clase se guardó, pero no se han podido guardar las reglas de cancelación y preinscripción." };
  }

  refrescar();
  revalidatePath("/admin/horarios");
  return { mensaje: "Guardado." };
}

// Elimina una clase. Si tiene personas apuntadas no se borra: hay que cancelarla desde Reservar clases (así se avisa y se devuelven los bonos).
export async function eliminarClase(sesionId: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("sesion_id", sesionId)
    .eq("estado", "reservada");
  if ((count ?? 0) > 0) {
    return { error: "Tiene personas apuntadas. Cancélala desde «Reservar clases»: así se les avisa y se devuelven sus clases." };
  }

  const { error } = await admin.from("sesiones_clase").delete().eq("id", sesionId);
  if (error) return { error: "No se ha podido eliminar la clase." };

  refrescar();
  return { mensaje: "Clase eliminada." };
}
