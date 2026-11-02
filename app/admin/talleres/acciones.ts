"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { colorLibre } from "@/lib/colores";
import { instanteMadrid } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const UUID = /^[0-9a-f-]{36}$/i;

function refrescar() {
  revalidatePath("/admin/talleres");
  revalidatePath("/admin/reservas");
  revalidatePath("/clases");
}

type Campos = { nombre: string; empieza: Date; plazas: number; duracion: number; modalidad: "presencial" | "online"; ubicacion: string | null; enlace: string | null };

// Lee y comprueba lo que llega del formulario (sirve para crear y para editar).
function leer(formData: FormData): Campos | { error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const empieza = instanteMadrid(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  const plazas = Math.floor(Number(formData.get("plazas")));
  const duracion = Math.floor(Number(formData.get("duracion")));
  const modalidad = String(formData.get("modalidad") ?? "presencial");
  const ubicacion = String(formData.get("ubicacion") ?? "").trim().slice(0, 150) || null;
  const enlace = String(formData.get("enlace") ?? "").trim().slice(0, 300) || null;
  if (nombre.length < 1 || nombre.length > 60) return { error: "Escribe el nombre del taller (hasta 60 letras)." };
  if (!empieza) return { error: "Elige el día y la hora." };
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(duracion >= 10 && duracion <= 240)) return { error: "La duración va de 10 a 240 minutos." };
  if (modalidad !== "presencial" && modalidad !== "online") return { error: "Elige si es presencial u online." };
  if (enlace && !/^https?:\/\//i.test(enlace)) return { error: "El enlace tiene que empezar por http:// o https://." };
  return { nombre, empieza, plazas, duracion, modalidad, ubicacion: modalidad === "presencial" ? ubicacion : null, enlace };
}

// Crea un taller: un tipo «taller» (si no existe ya con ese nombre) y su clase con el día, la hora y el lugar.
export async function crearTaller(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("talleres");
  const c = leer(formData);
  if ("error" in c) return { error: c.error };

  const admin = createAdminClient();
  let { data: tipo } = await admin.from("tipos_clase").select("id").eq("nombre", c.nombre).eq("servicio", "taller").maybeSingle();
  if (!tipo) {
    const { data: existentes } = await admin.from("tipos_clase").select("color, orden");
    const orden = Math.max(0, ...(existentes ?? []).map((e) => Number(e.orden) || 0)) + 10;
    const { data: nuevo, error } = await admin
      .from("tipos_clase")
      .insert({ color: colorLibre((existentes ?? []).map((e) => e.color)), nombre: c.nombre, plazas_max: c.plazas, minimo_alumnos: 0, plazas_prueba: 0, duracion_min: c.duracion, servicio: "taller", orden, lista_espera: false })
      .select("id")
      .single();
    if (error || !nuevo) return { error: error?.code === "23505" ? "Ya existe un tipo de clase con ese nombre." : "No se ha podido crear el taller." };
    tipo = nuevo;
  } else {
    await admin.from("tipos_clase").update({ duracion_min: c.duracion }).eq("id", tipo.id);
  }

  const { error } = await admin
    .from("sesiones_clase")
    .insert({ tipo_id: tipo.id, empieza_en: c.empieza.toISOString(), plazas: c.plazas, plazas_prueba: 0, modalidad: c.modalidad, ubicacion: c.ubicacion, enlace: c.enlace });
  if (error) {
    if (error.code === "23505") return { error: "Ya hay un taller con ese nombre a esa hora." };
    if (/modalidad|ubicacion|enlace/i.test(error.message)) return { error: "Falta ejecutar el archivo 064 en Supabase." };
    return { error: "No se ha podido crear el taller." };
  }
  refrescar();
  return { mensaje: "Taller creado. Ya sale en el calendario de reservas de quien tenga el servicio Talleres." };
}

// Borra del todo un taller cancelado que nunca tuvo reservas (si las tuvo, se conserva el historial y solo queda cancelado).
export async function borrarTaller(sesionId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin("talleres");
  if (!UUID.test(sesionId)) return { ok: false, error: "No se ha encontrado el taller." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("sesiones_clase").select("id, estado, tipo_id, tipos_clase!inner(servicio)").eq("id", sesionId).eq("tipos_clase.servicio", "taller").maybeSingle();
  if (!s) return { ok: false, error: "No se ha encontrado el taller." };
  if (s.estado !== "cancelada") return { ok: false, error: "Primero hay que cancelar el taller." };
  const { count } = await admin.from("reservas").select("id", { count: "exact", head: true }).eq("sesion_id", sesionId);
  if ((count ?? 0) > 0) return { ok: false, error: "Este taller tuvo reservas: se conserva su historial y no se puede borrar." };

  const { error } = await admin.from("sesiones_clase").delete().eq("id", sesionId);
  if (error) return { ok: false, error: "No se ha podido borrar." };
  // Si el tipo de taller se queda sin ninguna fecha, también se quita (si algo lo usa, se deja).
  const { count: quedan } = await admin.from("sesiones_clase").select("id", { count: "exact", head: true }).eq("tipo_id", s.tipo_id);
  if (quedan === 0) await admin.from("tipos_clase").delete().eq("id", s.tipo_id).eq("servicio", "taller");
  refrescar();
  return { ok: true };
}

// Vuelve a abrir un taller cancelado que todavía no ha pasado.
export async function recuperarTaller(sesionId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin("talleres");
  if (!UUID.test(sesionId)) return { ok: false, error: "No se ha encontrado el taller." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("sesiones_clase").select("empieza_en, estado").eq("id", sesionId).maybeSingle();
  if (!s || s.estado !== "cancelada") return { ok: false, error: "Ese taller no está cancelado." };
  if (new Date(s.empieza_en).getTime() <= Date.now()) return { ok: false, error: "Ese taller ya ha pasado." };
  const { error } = await admin.from("sesiones_clase").update({ estado: "programada" }).eq("id", sesionId);
  if (error) return { ok: false, error: "No se ha podido recuperar." };
  refrescar();
  return { ok: true };
}

// Cambia los datos de un taller ya creado.
export async function editarTaller(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("talleres");
  const id = String(formData.get("sesionId") ?? "");
  if (!UUID.test(id)) return { error: "No se ha encontrado el taller." };
  const c = leer(formData);
  if ("error" in c) return { error: c.error };

  const admin = createAdminClient();
  const { data: s } = await admin.from("sesiones_clase").select("tipo_id").eq("id", id).maybeSingle();
  if (!s) return { error: "No se ha encontrado el taller." };

  const { error } = await admin
    .from("sesiones_clase")
    .update({ empieza_en: c.empieza.toISOString(), plazas: c.plazas, modalidad: c.modalidad, ubicacion: c.ubicacion, enlace: c.enlace })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? "Ya hay un taller a esa hora." : "No se ha podido guardar." };
  await admin.from("tipos_clase").update({ duracion_min: c.duracion }).eq("id", s.tipo_id);

  refrescar();
  return { mensaje: "Taller guardado." };
}
