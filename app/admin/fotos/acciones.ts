"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoFoto = { ok: boolean; url?: string | null; error?: string };

export type Destino = "tipo_clase" | "rutina" | "ejercicio" | "portada" | "inicio";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 1024 * 1024; // 1 MB (el navegador ya la reduce a unos 150 KB)
const TABLAS = { tipo_clase: "tipos_clase", rutina: "rutinas", ejercicio: "ejercicios" } as const;
const MARCA = "/object/public/fotos/";

function esDestino(valor: string): valor is Destino {
  return ["tipo_clase", "rutina", "ejercicio", "portada", "inicio"].includes(valor);
}

async function urlActual(destino: Destino, id: string): Promise<string | null> {
  const admin = createAdminClient();
  if (destino === "portada" || destino === "inicio") {
    const { data } = await admin.from("fotos_app").select("url").eq("clave", destino).maybeSingle();
    return data?.url ?? null;
  }
  const { data } = await admin.from(TABLAS[destino]).select("foto_url").eq("id", id).maybeSingle();
  return (data as { foto_url: string | null } | null)?.foto_url ?? null;
}

async function guardarUrl(destino: Destino, id: string, url: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (destino === "portada" || destino === "inicio") {
    if (url === null) return !(await admin.from("fotos_app").delete().eq("clave", destino)).error;
    return !(await admin.from("fotos_app").upsert({ clave: destino, url })).error;
  }
  return !(await admin.from(TABLAS[destino]).update({ foto_url: url }).eq("id", id)).error;
}

async function borrarArchivo(url: string | null) {
  const i = url?.indexOf(MARCA) ?? -1;
  if (!url || i < 0) return;
  await createAdminClient().storage.from("fotos").remove([decodeURIComponent(url.slice(i + MARCA.length))]);
}

function repasar() {
  for (const ruta of ["/", "/inicio", "/clases", "/rutina", "/admin", "/admin/clases", "/admin/rutinas", "/admin/ejercicios"]) {
    revalidatePath(ruta);
  }
}

// Cambia la foto de un tipo de clase, rutina, ejercicio, o la de la portada / Inicio.
export async function cambiarFotoApp(formData: FormData): Promise<ResultadoFoto> {
  await requireAdmin();

  const destino = String(formData.get("destino") ?? "");
  const id = String(formData.get("id") ?? "");
  const archivo = formData.get("foto");
  if (!esDestino(destino) || (destino !== "portada" && destino !== "inicio" && !id)) {
    return { ok: false, error: "Falta indicar dónde va la foto." };
  }
  if (!(archivo instanceof File) || !(archivo.type in TIPOS) || archivo.size === 0 || archivo.size > MAX) {
    return { ok: false, error: "La foto debe ser jpg, png o webp y pesar menos de 1 MB." };
  }

  const admin = createAdminClient();
  const ruta = `${destino}/${id || "app"}-${Date.now()}.${TIPOS[archivo.type]}`;
  const { error } = await admin.storage
    .from("fotos")
    .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type });
  if (error) return { ok: false, error: "No se ha podido subir la foto." };

  const url = admin.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
  const antes = await urlActual(destino, id);
  if (!(await guardarUrl(destino, id, url))) {
    await admin.storage.from("fotos").remove([ruta]);
    return { ok: false, error: "No se ha podido guardar la foto." };
  }
  await borrarArchivo(antes);
  repasar();
  return { ok: true, url };
}

// Quita la foto propia: vuelve a verse la foto de ejemplo.
export async function quitarFotoApp(destino: string, id: string): Promise<ResultadoFoto> {
  await requireAdmin();
  if (!esDestino(destino)) return { ok: false, error: "Destino no válido." };

  const antes = await urlActual(destino, id);
  if (!(await guardarUrl(destino, id, null))) return { ok: false, error: "No se ha podido quitar." };
  await borrarArchivo(antes);
  repasar();
  return { ok: true, url: null };
}
