"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { TIPOS, type Campo } from "@/lib/ejercicios";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Resultado = { ok: boolean; error?: string; id?: string };

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

// Número entero opcional: "" -> null, texto no numérico -> NaN.
function enteroOpc(formData: FormData, clave: string): number | null {
  const t = texto(formData, clave);
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : NaN;
}

function decimalOpc(formData: FormData, clave: string): number | null {
  const t = texto(formData, clave).replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function mensajeDe(error: { message: string } | null): string {
  return error?.message ?? "No se ha podido guardar.";
}

function refrescar(rutinaId?: string) {
  revalidatePath("/admin/rutinas");
  revalidatePath("/admin/plantillas-online");
  if (rutinaId) revalidatePath(`/admin/rutinas/${rutinaId}`);
}

// ---------- Rutinas ----------

// Crea una rutina vacía, una plantilla (sin alumno) o una copia de una plantilla/rutina.
export async function crearRutina(_previo: Estado, formData: FormData): Promise<Estado & { id?: string }> {
  await requireAdmin();

  const nombre = texto(formData, "nombre");
  const destino = texto(formData, "alumno"); // "" o "plantilla" = plantilla
  const desde = texto(formData, "desde"); // id de rutina a copiar (opcional)
  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (destino !== "plantilla" && !UUID.test(destino)) return { error: "Elige un alumno o «Plantilla»." };
  if (desde && !UUID.test(desde)) return { error: "Plantilla no válida." };

  const admin = createAdminClient();
  const userId = destino === "plantilla" ? null : destino;

  if (desde) {
    const { data, error } = await admin.rpc("duplicar_rutina", {
      p_rutina: desde,
      p_user_destino: userId,
      p_nombre: nombre,
    });
    if (error) return { error: mensajeDe(error) };
    refrescar();
    return { mensaje: "Rutina creada a partir de la plantilla.", id: data as string };
  }

  if (userId) {
    const { data: persona } = await admin.from("profiles").select("rol").eq("id", userId).maybeSingle();
    if (persona?.rol !== "alumno") return { error: "La persona debe ser alumno." };
  }

  const { data, error } = await admin
    .from("rutinas")
    .insert({ user_id: userId, nombre })
    .select("id")
    .single();
  if (error || !data) return { error: "No se ha podido crear la rutina." };

  refrescar();
  return { mensaje: "Rutina creada.", id: data.id };
}

export async function actualizarRutina(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  const nota = texto(formData, "nota");
  const entrenos = enteroOpc(formData, "entrenos_semana");
  const semanas = enteroOpc(formData, "semanas") ?? 4;
  if (!UUID.test(id)) return { error: "Rutina no válida." };
  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (nota.length > 1000) return { error: "La nota puede tener como máximo 1000 letras." };
  if (!(semanas >= 1 && semanas <= 52)) return { error: "Las semanas de duración van de 1 a 52." };
  if (entrenos !== null && !(entrenos >= 1 && entrenos <= 14)) {
    return { error: "Los entrenos por semana van de 1 a 14 (o déjalo vacío)." };
  }

  const { error } = await createAdminClient()
    .from("rutinas")
    .update({
      nombre,
      nota: nota || null,
      entrenos_semana: entrenos,
      semanas,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar." };

  refrescar(id);
  return { mensaje: "Datos de la rutina guardados." };
}

export async function publicarRutina(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  if (!UUID.test(id)) return { error: "Rutina no válida." };

  const { error } = await createAdminClient().rpc("publicar_rutina", { p_rutina: id });
  if (error) return { error: mensajeDe(error) };

  refrescar(id);
  return { mensaje: "Rutina publicada. El alumno ya la ve (la anterior pasa a su historial)." };
}

export async function despublicarRutina(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  if (!UUID.test(id)) return { error: "Rutina no válida." };

  const { error } = await createAdminClient().rpc("despublicar_rutina", { p_rutina: id });
  if (error) return { error: mensajeDe(error) };

  refrescar(id);
  return { mensaje: "Rutina vuelta a borrador. El alumno ya no la ve." };
}

// Copia a otro alumno o la guarda como plantilla (destino «plantilla»).
export async function copiarRutina(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const destino = texto(formData, "alumno");
  const nombre = texto(formData, "nombre");
  if (!UUID.test(id)) return { error: "Rutina no válida." };
  if (destino !== "plantilla" && !UUID.test(destino)) return { error: "Elige un alumno o «Plantilla»." };
  if (nombre.length > 80) return { error: "El nombre puede tener como máximo 80 letras." };

  const { error } = await createAdminClient().rpc("duplicar_rutina", {
    p_rutina: id,
    p_user_destino: destino === "plantilla" ? null : destino,
    p_nombre: nombre,
  });
  if (error) return { error: mensajeDe(error) };

  refrescar();
  return {
    mensaje:
      destino === "plantilla"
        ? "Guardada como plantilla (la encontrarás en la lista de rutinas)."
        : "Copia creada como borrador para ese alumno (la encontrarás en la lista de rutinas).",
  };
}

export async function eliminarRutina(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  if (!UUID.test(id)) return { error: "Rutina no válida." };

  const admin = createAdminClient();
  const { data } = await admin.from("rutinas").select("estado").eq("id", id).maybeSingle();
  if (data?.estado === "publicada") {
    return { error: "Una rutina publicada no se puede borrar: primero pásala a borrador." };
  }

  const { error } = await admin.from("rutinas").delete().eq("id", id);
  if (error) return { error: "No se ha podido borrar." };

  refrescar();
  return { mensaje: "Rutina borrada." };
}

// ---------- Sesiones ----------

export async function agregarSesion(rutinaId: string, nombre: string): Promise<Resultado> {
  await requireAdmin();
  const limpio = nombre.trim();
  if (!UUID.test(rutinaId)) return { ok: false, error: "Rutina no válida." };
  if (limpio.length < 1 || limpio.length > 80) return { ok: false, error: "El nombre de la sesión debe tener entre 1 y 80 letras." };

  const { data, error } = await createAdminClient().rpc("agregar_sesion", {
    p_rutina: rutinaId,
    p_nombre: limpio,
  });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true, id: data as string };
}

export async function renombrarSesion(rutinaId: string, sesionId: string, nombre: string, nota: string): Promise<Resultado> {
  await requireAdmin();
  const limpio = nombre.trim();
  if (!UUID.test(sesionId)) return { ok: false, error: "Sesión no válida." };
  if (limpio.length < 1 || limpio.length > 80) return { ok: false, error: "El nombre debe tener entre 1 y 80 letras." };
  if (nota.length > 1000) return { ok: false, error: "La nota puede tener como máximo 1000 letras." };

  const { error } = await createAdminClient()
    .from("rutina_sesiones")
    .update({ nombre: limpio, nota: nota.trim() || null })
    .eq("id", sesionId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  refrescar(rutinaId);
  return { ok: true };
}

export async function quitarSesion(rutinaId: string, sesionId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(sesionId)) return { ok: false, error: "Sesión no válida." };

  const { error } = await createAdminClient().from("rutina_sesiones").delete().eq("id", sesionId);
  if (error) return { ok: false, error: "No se ha podido quitar la sesión." };
  refrescar(rutinaId);
  return { ok: true };
}

export async function reordenarSesiones(rutinaId: string, ids: string[]): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(rutinaId) || ids.some((i) => !UUID.test(i))) return { ok: false, error: "Datos no válidos." };

  const { error } = await createAdminClient().rpc("reordenar_sesiones", { p_rutina: rutinaId, p_ids: ids });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

// ---------- Ejercicios de una sesión ----------

export async function agregarItem(rutinaId: string, sesionId: string, ejercicioId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(sesionId) || !UUID.test(ejercicioId)) return { ok: false, error: "Datos no válidos." };

  const { error } = await createAdminClient().rpc("agregar_item", {
    p_sesion: sesionId,
    p_ejercicio: ejercicioId,
  });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

export async function quitarItem(rutinaId: string, itemId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(itemId)) return { ok: false, error: "Ejercicio no válido." };

  const { error } = await createAdminClient().rpc("quitar_item", { p_item: itemId });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

export async function reordenarItems(rutinaId: string, sesionId: string, ids: string[]): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(sesionId) || ids.some((i) => !UUID.test(i))) return { ok: false, error: "Datos no válidos." };

  const { error } = await createAdminClient().rpc("reordenar_items", { p_sesion: sesionId, p_ids: ids });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

export async function unirConAnterior(rutinaId: string, itemId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(itemId)) return { ok: false, error: "Ejercicio no válido." };

  const { error } = await createAdminClient().rpc("unir_con_anterior", { p_item: itemId });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

export async function separarItem(rutinaId: string, itemId: string): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(itemId)) return { ok: false, error: "Ejercicio no válido." };

  const { error } = await createAdminClient().rpc("separar_item", { p_item: itemId });
  if (error) return { ok: false, error: mensajeDe(error) };
  refrescar(rutinaId);
  return { ok: true };
}

// Guarda series, objetivos, descanso y nota de un ejercicio de la rutina.
// Los objetivos que piden los campos del tipo del ejercicio son obligatorios; los demás se ignoran.
export async function guardarItem(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const rutinaId = texto(formData, "rutina");
  if (!UUID.test(id) || !UUID.test(rutinaId)) return { error: "Ejercicio no válido." };

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("rutina_items")
    .select("id, ejercicios(tipo)")
    .eq("id", id)
    .maybeSingle();
  const tipoValor = (item as unknown as { ejercicios: { tipo: string } | null } | null)?.ejercicios?.tipo;
  const tipo = TIPOS.find((t) => t.valor === tipoValor);
  if (!tipo) return { error: "Ejercicio no encontrado." };
  const campos = tipo.campos as readonly Campo[];

  const series = enteroOpc(formData, "series");
  const descanso = enteroOpc(formData, "descanso_seg");
  const nota = texto(formData, "nota");
  if (series === null || !(series >= 1 && series <= 20)) return { error: "Las series deben ser de 1 a 20." };
  if (descanso === null || !(descanso >= 0 && descanso <= 900)) return { error: "El descanso va de 0 a 900 segundos." };
  if (nota.length > 300) return { error: "La nota puede tener como máximo 300 letras." };

  const cambios: Record<string, number | string | null> = {
    series,
    descanso_seg: descanso,
    nota: nota || null,
    reps_min: null,
    reps_max: null,
    segundos_min: null,
    segundos_max: null,
    peso_kg: null,
    distancia_m: null,
  };

  if (campos.includes("reps")) {
    const min = enteroOpc(formData, "reps_min");
    const max = enteroOpc(formData, "reps_max");
    if (min === null || !(min >= 1 && min <= 500)) return { error: "Indica las repeticiones (1 a 500)." };
    if (max !== null && (!(max >= 1 && max <= 500) || max < min)) {
      return { error: "El máximo de repeticiones debe ser igual o mayor que el mínimo." };
    }
    cambios.reps_min = min;
    cambios.reps_max = max;
  }
  if (campos.includes("segundos")) {
    const min = enteroOpc(formData, "segundos_min");
    const max = enteroOpc(formData, "segundos_max");
    // En "distancia y duración" la duración es opcional; en "duración" es obligatoria.
    const obligatorio = tipo.valor === "duracion";
    if ((obligatorio && min === null) || (min !== null && !(min >= 1 && min <= 7200))) {
      return { error: "Indica los segundos (1 a 7200)." };
    }
    if (max !== null && (min === null || !(max >= 1 && max <= 7200) || max < min)) {
      return { error: "El máximo de segundos debe ser igual o mayor que el mínimo." };
    }
    cambios.segundos_min = min;
    cambios.segundos_max = max;
  }
  if (campos.includes("peso")) {
    const peso = decimalOpc(formData, "peso_kg");
    if (peso !== null && !(peso >= 0 && peso <= 500)) return { error: "El peso va de 0 a 500 kg." };
    cambios.peso_kg = peso;
  }
  if (campos.includes("distancia")) {
    const d = enteroOpc(formData, "distancia_m");
    if (d === null || !(d >= 1 && d <= 100000)) return { error: "Indica la distancia en metros." };
    cambios.distancia_m = d;
  }

  const { error } = await admin.from("rutina_items").update(cambios).eq("id", id);
  if (error) return { error: "No se ha podido guardar. Revisa los números." };

  refrescar(rutinaId);
  return { mensaje: "Guardado." };
}

// ---------- Carpetas (como en un Drive) ----------

export async function crearCarpeta(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const nombre = texto(formData, "nombre");
  const padre = texto(formData, "padre");
  if (nombre.length < 1 || nombre.length > 60) return { error: "El nombre debe tener entre 1 y 60 letras." };
  if (padre && !UUID.test(padre)) return { error: "Carpeta no válida." };

  const { error } = await createAdminClient().from("carpetas_rutinas").insert({ nombre, padre_id: padre || null });
  if (error) return { error: "No se ha podido crear la carpeta. ¿Has ejecutado el archivo 044 en Supabase?" };
  refrescar();
  return { mensaje: "Carpeta creada." };
}

export async function renombrarCarpeta(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  if (!UUID.test(id)) return { error: "Carpeta no válida." };
  if (nombre.length < 1 || nombre.length > 60) return { error: "El nombre debe tener entre 1 y 60 letras." };
  const { error } = await createAdminClient().from("carpetas_rutinas").update({ nombre }).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  refrescar();
  return { mensaje: "Guardado." };
}

// Borra una carpeta y sus subcarpetas. Las rutinas no se borran: vuelven al inicio.
export async function eliminarCarpeta(id: string): Promise<Estado> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Carpeta no válida." };
  const { error } = await createAdminClient().from("carpetas_rutinas").delete().eq("id", id);
  if (error) return { error: "No se ha podido eliminar la carpeta." };
  refrescar();
  return { mensaje: "Carpeta eliminada. Sus rutinas han vuelto al inicio." };
}

export async function moverRutina(rutinaId: string, carpetaId: string | null): Promise<Estado> {
  await requireAdmin();
  if (!UUID.test(rutinaId) || (carpetaId !== null && !UUID.test(carpetaId))) return { error: "No válido." };
  const { error } = await createAdminClient().from("rutinas").update({ carpeta_id: carpetaId }).eq("id", rutinaId);
  if (error) return { error: "No se ha podido mover la rutina." };
  refrescar();
  return { mensaje: carpetaId ? "Rutina movida a la carpeta." : "Rutina movida al inicio." };
}

// ---------- Duplicar y eliminar con el mismo formato que el resto de listas ----------

// Copia una rutina para la misma persona (o una plantilla), con «(copia)» en el nombre. Queda como borrador.
export async function duplicarRutinaLista(id: string): Promise<Estado> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Rutina no válida." };
  const admin = createAdminClient();
  const { data: o } = await admin.from("rutinas").select("nombre, user_id").eq("id", id).maybeSingle();
  if (!o) return { error: "No se ha encontrado la rutina." };

  const { error } = await admin.rpc("duplicar_rutina", { p_rutina: id, p_user_destino: o.user_id, p_nombre: `${o.nombre} (copia)` });
  if (error) return { error: mensajeDe(error) };
  refrescar();
  return { mensaje: `Creada «${o.nombre} (copia)».` };
}

export async function eliminarRutinaLista(id: string): Promise<Estado> {
  const datos = new FormData();
  datos.set("id", id);
  return eliminarRutina({}, datos);
}
