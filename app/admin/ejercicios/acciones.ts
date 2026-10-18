"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIAS, MEDIDAS } from "@/lib/ejercicios";
import { createAdminClient } from "@/lib/supabase/admin";
import { analizarVideo } from "@/lib/video";
import type { Estado } from "../acciones";

type Campos = {
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  medida: string;
  descripcion: string | null;
  descripcion_en: string | null;
  video_url: string | null;
};

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

// Lee y valida el formulario. Devuelve un error o los campos ya limpios.
function leerCampos(formData: FormData): { error: string } | { campos: Campos } {
  const nombre = texto(formData, "nombre");
  const nombreEn = texto(formData, "nombre_en");
  const categoria = texto(formData, "categoria");
  const medida = texto(formData, "medida");
  const descripcion = texto(formData, "descripcion");
  const descripcionEn = texto(formData, "descripcion_en");
  const video = texto(formData, "video_url");

  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (nombreEn && (nombreEn.length < 2 || nombreEn.length > 80)) {
    return { error: "El nombre en inglés debe tener entre 2 y 80 letras." };
  }
  if (!CATEGORIAS.some((c) => c.valor === categoria)) return { error: "Elige una categoría." };
  if (!MEDIDAS.some((m) => m.valor === medida)) return { error: "Elige si se mide en repeticiones o en segundos." };
  if (descripcion.length > 2000 || descripcionEn.length > 2000) {
    return { error: "Las explicaciones pueden tener como máximo 2000 letras." };
  }

  let enlace: string | null = null;
  if (video) {
    const analizado = analizarVideo(video);
    if (!analizado) return { error: "Pega un enlace de YouTube o de Google Drive." };
    enlace = analizado.enlace;
  }

  return {
    campos: {
      nombre,
      nombre_en: nombreEn || null,
      categoria,
      medida,
      descripcion: descripcion || null,
      descripcion_en: descripcionEn || null,
      video_url: enlace,
    },
  };
}

function errorDeBase(codigo: string | undefined): string {
  return codigo === "23505"
    ? "Ya existe un ejercicio con ese nombre."
    : "No se ha podido guardar. Inténtalo de nuevo.";
}

export async function crearEjercicio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const leido = leerCampos(formData);
  if ("error" in leido) return { error: leido.error };

  const { error } = await createAdminClient().from("ejercicios").insert(leido.campos);
  if (error) return { error: errorDeBase(error.code) };

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Ejercicio creado." };
}

export async function editarEjercicio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const leido = leerCampos(formData);
  if ("error" in leido) return { error: leido.error };

  const { error } = await createAdminClient()
    .from("ejercicios")
    .update({
      ...leido.campos,
      activo: formData.get("activo") === "on",
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", texto(formData, "id"));
  if (error) return { error: errorDeBase(error.code) };

  revalidatePath("/admin/ejercicios");
  return { mensaje: "Cambios guardados." };
}
