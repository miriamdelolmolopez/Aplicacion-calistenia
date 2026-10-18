"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function limpiarNombre(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim().replace(/\s+/g, " ");
}

function refrescar() {
  revalidatePath("/admin/horarios");
}

export async function crearPlantilla(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const nombre = limpiarNombre(formData.get("nombre"));
  if (nombre.length < 1 || nombre.length > 60) return { error: "Escribe un nombre (hasta 60 letras)." };

  const { error } = await createAdminClient().from("plantillas_horario").insert({ nombre });
  if (error) {
    return { error: error.code === "23505" ? "Ya hay una plantilla con ese nombre." : "No se ha podido crear." };
  }
  refrescar();
  return { mensaje: "Plantilla creada. Ábrela para añadirle clases." };
}

export async function renombrarPlantilla(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const nombre = limpiarNombre(formData.get("nombre"));
  if (nombre.length < 1 || nombre.length > 60) return { error: "Escribe un nombre (hasta 60 letras)." };

  const { error } = await createAdminClient()
    .from("plantillas_horario")
    .update({ nombre })
    .eq("id", String(formData.get("id") ?? ""));
  if (error) {
    return { error: error.code === "23505" ? "Ya hay una plantilla con ese nombre." : "No se ha podido guardar." };
  }
  refrescar();
  return { mensaje: "Nombre guardado." };
}

// Copia la plantilla con todas sus clases, con el nombre «… (copia)».
export async function duplicarPlantilla(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  const { data: origen } = await admin.from("plantillas_horario").select("nombre").eq("id", id).maybeSingle();
  if (!origen) return { error: "No se ha encontrado la plantilla." };

  const { data: existentes } = await admin.from("plantillas_horario").select("nombre");
  const usados = new Set((existentes ?? []).map((p) => p.nombre.toLowerCase()));
  let nombre = `${origen.nombre} (copia)`.slice(0, 60);
  for (let n = 2; usados.has(nombre.toLowerCase()); n++) nombre = `${origen.nombre} (copia ${n})`.slice(0, 60);

  const { data: nueva, error } = await admin.from("plantillas_horario").insert({ nombre }).select("id").single();
  if (error || !nueva) return { error: "No se ha podido duplicar." };

  const { data: clases } = await admin
    .from("plantilla_clases")
    .select("tipo_id, dia_semana, hora, plazas")
    .eq("plantilla_id", id);
  if (clases && clases.length > 0) {
    const { error: falloClases } = await admin
      .from("plantilla_clases")
      .insert(clases.map((c) => ({ ...c, plantilla_id: nueva.id })));
    if (falloClases) {
      await admin.from("plantillas_horario").delete().eq("id", nueva.id);
      return { error: "No se ha podido duplicar." };
    }
  }
  refrescar();
  return { mensaje: `Duplicada como «${nombre}».` };
}

export async function marcarPrincipal(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  await admin.from("plantillas_horario").update({ principal: false }).eq("principal", true);
  const { error } = await admin.from("plantillas_horario").update({ principal: true }).eq("id", id);
  if (error) return { error: "No se ha podido cambiar." };
  refrescar();
  revalidatePath("/admin/clases");
  return { mensaje: "Ahora es la principal: el botón «Crear clases» usará esta plantilla." };
}

export async function borrarPlantilla(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  const { data } = await admin.from("plantillas_horario").select("principal").eq("id", id).maybeSingle();
  if (!data) return { error: "No se ha encontrado la plantilla." };
  if (data.principal) return { error: "No se puede borrar la plantilla principal. Marca otra como principal antes." };

  const { error } = await admin.from("plantillas_horario").delete().eq("id", id);
  if (error) return { error: "No se ha podido borrar." };
  refrescar();
  return { mensaje: "Plantilla borrada. Las clases que ya se crearon con ella no cambian." };
}

export async function anadirClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const dia = Number(formData.get("dia"));
  const hora = String(formData.get("hora") ?? "");
  const plazasTexto = String(formData.get("plazas") ?? "").trim();
  const plazas = plazasTexto === "" ? null : Number(plazasTexto);

  if (!Number.isInteger(dia) || dia < 1 || dia > 7) return { error: "Elige el día." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { error: "Escribe la hora, por ejemplo 18:35." };
  if (plazas !== null && (!Number.isInteger(plazas) || plazas < 1 || plazas > 100)) {
    return { error: "Las plazas van de 1 a 100 (o déjalo vacío para usar las del tipo de clase)." };
  }

  const { error } = await createAdminClient().from("plantilla_clases").insert({
    plantilla_id: String(formData.get("plantillaId") ?? ""),
    tipo_id: String(formData.get("tipo") ?? ""),
    dia_semana: dia,
    hora,
    plazas,
  });
  if (error) {
    return { error: error.code === "23505" ? "Esa clase ya está en la plantilla a esa hora." : "No se ha podido añadir." };
  }
  refrescar();
  return { mensaje: "Clase añadida." };
}

export async function quitarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("plantilla_clases")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: "No se ha podido quitar." };
  refrescar();
  return {};
}

// Crea las clases que falten en una o varias semanas (de lunes a domingo).
export async function aplicarPlantilla(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const fecha = String(formData.get("fecha") ?? "");
  const semanas = Number(formData.get("semanas"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elige una fecha de la primera semana." };
  if (!Number.isInteger(semanas) || semanas < 1 || semanas > 12) return { error: "Entre 1 y 12 semanas." };

  const { data, error } = await createAdminClient().rpc("aplicar_plantilla", {
    p_plantilla: String(formData.get("id") ?? ""),
    p_fecha: fecha,
    p_semanas: semanas,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/clases");
  const n = Number(data ?? 0);
  return {
    mensaje:
      n === 0
        ? "No se ha creado ninguna clase: ya existían todas (o esas fechas ya han pasado)."
        : `Se han creado ${n} ${n === 1 ? "clase" : "clases"}. Las que ya existían no se han tocado.`,
  };
}
