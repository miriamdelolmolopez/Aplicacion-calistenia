"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIAS, MUSCULOS, TIPOS } from "@/lib/ejercicios";
import { createAdminClient } from "@/lib/supabase/admin";
import { analizarVideo } from "@/lib/video";
import type { Estado } from "../acciones";

type Campos = {
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  tipo: string;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
};

type Relaciones = {
  musculos: { musculo: string; rol: string }[];
  materiales: string[];
  materialNuevo: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

// Lee y valida el formulario. Devuelve un error o los datos ya limpios.
function leer(
  formData: FormData,
): { error: string } | { campos: Campos; relaciones: Relaciones } {
  const nombre = texto(formData, "nombre");
  const nombreEn = texto(formData, "nombre_en");
  const categoria = texto(formData, "categoria");
  const tipo = texto(formData, "tipo");
  const descripcion = texto(formData, "descripcion");
  const descripcionEn = texto(formData, "descripcion_en");
  const video = texto(formData, "video_url");

  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (nombreEn && (nombreEn.length < 2 || nombreEn.length > 80)) {
    return { error: "El nombre en inglés debe tener entre 2 y 80 letras." };
  }
  if (!CATEGORIAS.some((c) => c.valor === categoria)) return { error: "Elige una categoría." };
  if (!TIPOS.some((t) => t.valor === tipo)) return { error: "Elige el tipo de ejercicio." };
  if (descripcion.length > 2000 || descripcionEn.length > 2000) {
    return { error: "Las explicaciones pueden tener como máximo 2000 letras." };
  }

  let enlace: string | null = null;
  if (video) {
    const analizado = analizarVideo(video);
    if (!analizado) return { error: "Pega un enlace de YouTube o de Google Drive." };
    enlace = analizado.enlace;
  }

  const musculos: { musculo: string; rol: string }[] = [];
  for (const m of MUSCULOS) {
    const rol = texto(formData, `musculo_${m.valor}`);
    if (rol === "principal" || rol === "secundario") musculos.push({ musculo: m.valor, rol });
  }
  if (!musculos.some((m) => m.rol === "principal")) {
    return { error: "Marca al menos un músculo principal." };
  }

  const materiales = formData.getAll("materiales").map(String);
  if (materiales.some((id) => !UUID.test(id))) return { error: "Material no válido." };
  const materialNuevo = texto(formData, "material_nuevo");
  if (materialNuevo && (materialNuevo.length < 2 || materialNuevo.length > 60)) {
    return { error: "El material nuevo debe tener entre 2 y 60 letras." };
  }

  return {
    campos: {
      nombre,
      nombre_en: nombreEn || null,
      categoria,
      tipo,
      descripcion: descripcion || null,
      descripcion_en: descripcionEn || null,
      video_url: enlace,
    },
    relaciones: { musculos, materiales, materialNuevo },
  };
}

function errorDeBase(codigo: string | undefined): string {
  return codigo === "23505"
    ? "Ya existe un ejercicio con ese nombre."
    : "No se ha podido guardar. Inténtalo de nuevo.";
}

// Si se escribió un material nuevo, lo crea (o reutiliza el que ya exista con ese nombre) y devuelve su id.
async function idMaterialNuevo(nombre: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existente } = await admin.from("materiales").select("id").ilike("nombre", nombre).maybeSingle();
  if (existente) return existente.id as string;
  const { data, error } = await admin.from("materiales").insert({ nombre, orden: 100 }).select("id").single();
  return error || !data ? null : (data.id as string);
}

async function guardarRelaciones(id: string, r: Relaciones) {
  const materiales = [...r.materiales];
  if (r.materialNuevo) {
    const nuevo = await idMaterialNuevo(r.materialNuevo);
    if (nuevo && !materiales.includes(nuevo)) materiales.push(nuevo);
  }
  return createAdminClient().rpc("guardar_relaciones_ejercicio", {
    p_ejercicio: id,
    p_musculos: r.musculos,
    p_materiales: materiales,
  });
}

export async function crearEjercicio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const leido = leer(formData);
  if ("error" in leido) return { error: leido.error };

  const admin = createAdminClient();
  const { data, error } = await admin.from("ejercicios").insert(leido.campos).select("id").single();
  if (error || !data) return { error: errorDeBase(error?.code) };

  const { error: falloRelaciones } = await guardarRelaciones(data.id, leido.relaciones);
  if (falloRelaciones) {
    // Si no se pudieron guardar los músculos, no dejamos el ejercicio a medias.
    await admin.from("ejercicios").delete().eq("id", data.id);
    return { error: "No se han podido guardar los músculos. Inténtalo de nuevo." };
  }

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Ejercicio creado." };
}

export async function editarEjercicio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const leido = leer(formData);
  if ("error" in leido) return { error: leido.error };

  const id = texto(formData, "id");
  const { error } = await createAdminClient()
    .from("ejercicios")
    .update({
      ...leido.campos,
      activo: formData.get("activo") === "on",
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: errorDeBase(error.code) };

  const { error: falloRelaciones } = await guardarRelaciones(id, leido.relaciones);
  if (falloRelaciones) return { error: "No se han podido guardar los músculos y el material." };

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Cambios guardados." };
}

export async function crearMaterial(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const nombre = texto(formData, "nombre");
  const nombreEn = texto(formData, "nombre_en");
  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre debe tener entre 2 y 60 letras." };
  if (nombreEn && (nombreEn.length < 2 || nombreEn.length > 60)) {
    return { error: "El nombre en inglés debe tener entre 2 y 60 letras." };
  }

  const { error } = await createAdminClient()
    .from("materiales")
    .insert({ nombre, nombre_en: nombreEn || null, orden: 100 });
  if (error) {
    return {
      error:
        error.code === "23505" ? "Ya existe ese material." : "No se ha podido guardar el material.",
    };
  }

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Material añadido." };
}

// Guarda solo el enlace del vídeo de un ejercicio (YouTube o Google Drive). Vacío = quitar el vídeo.
export async function guardarVideoEjercicio(
  id: string,
  enlace: string,
): Promise<{ ok: boolean; error?: string; enlace?: string | null }> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Ejercicio no válido." };

  const limpio = enlace.trim();
  let guardar: string | null = null;
  if (limpio) {
    const analizado = analizarVideo(limpio);
    if (!analizado) return { ok: false, error: "Pega un enlace de YouTube o de Google Drive." };
    guardar = analizado.enlace;
  }

  const { error } = await createAdminClient().from("ejercicios").update({ video_url: guardar }).eq("id", id);
  if (error) return { ok: false, error: "No se ha podido guardar el vídeo." };

  revalidatePath("/admin/ejercicios");
  revalidatePath("/rutina");
  return { ok: true, enlace: guardar };
}

// Cambia el nombre de un material, lo oculta o lo muestra.
export async function editarMaterial(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  const nombreEn = texto(formData, "nombre_en");
  if (!UUID.test(id)) return { error: "Material no válido." };
  if (nombre.length < 2 || nombre.length > 60) return { error: "El nombre debe tener entre 2 y 60 letras." };
  if (nombreEn && (nombreEn.length < 2 || nombreEn.length > 60)) {
    return { error: "El nombre en inglés debe tener entre 2 y 60 letras." };
  }

  const { error } = await createAdminClient()
    .from("materiales")
    .update({ nombre, nombre_en: nombreEn || null, activo: formData.get("activo") === "on" })
    .eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un material con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Cambios guardados." };
}

// Borra un material (se quita también de los ejercicios que lo tenían).
export async function borrarMaterial(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Material no válido." };

  const { error } = await createAdminClient().from("materiales").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar el material." };

  revalidatePath("/admin/ejercicios");
  return { ok: true };
}
