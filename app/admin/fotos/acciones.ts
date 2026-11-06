"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { conEncuadre, sinEncuadre } from "@/lib/fotos";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoFoto = { ok: boolean; url?: string | null; error?: string };

export type Destino = "tipo_clase" | "rutina" | "sesion" | "ejercicio" | "curso" | "glosario" | "historia" | "portada" | "inicio" | "card";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 1024 * 1024; // 1 MB (el navegador ya la reduce a unos 150 KB)
const TABLAS = { tipo_clase: "tipos_clase", rutina: "rutinas", sesion: "rutina_sesiones", ejercicio: "ejercicios", curso: "cursos", glosario: "glosario", historia: "historia" } as const;
const MARCA = "/object/public/fotos/";

// Las fotos de tarjetas se guardan como «card:<nombre de la tarjeta>».
function claveApp(destino: Destino, id: string): string {
  return destino === "card" ? `card:${id}` : destino;
}

function esDestino(valor: string): valor is Destino {
  return ["tipo_clase", "rutina", "sesion", "ejercicio", "curso", "glosario", "historia", "portada", "inicio", "card"].includes(valor);
}

async function urlActual(destino: Destino, id: string): Promise<string | null> {
  const admin = createAdminClient();
  if (destino === "portada" || destino === "inicio" || destino === "card") {
    const { data } = await admin.from("fotos_app").select("url").eq("clave", claveApp(destino, id)).maybeSingle();
    return data?.url ?? null;
  }
  const { data } = await admin.from(TABLAS[destino]).select("foto_url").eq("id", id).maybeSingle();
  return (data as { foto_url: string | null } | null)?.foto_url ?? null;
}

async function guardarUrl(destino: Destino, id: string, url: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (destino === "portada" || destino === "inicio" || destino === "card") {
    const clave = claveApp(destino, id);
    if (url === null) return !(await admin.from("fotos_app").delete().eq("clave", clave)).error;
    return !(await admin.from("fotos_app").upsert({ clave, url })).error;
  }
  return !(await admin.from(TABLAS[destino]).update({ foto_url: url }).eq("id", id)).error;
}

async function borrarArchivo(url: string | null) {
  const limpia = url ? sinEncuadre(url) : null;
  const i = limpia?.indexOf(MARCA) ?? -1;
  if (!limpia || i < 0) return;
  await createAdminClient().storage.from("fotos").remove([decodeURIComponent(limpia.slice(i + MARCA.length))]);
}

function repasar() {
  for (const ruta of ["/", "/inicio", "/clases", "/rutina", "/rutina/ver", "/admin", "/admin/contenido", "/admin/clases", "/admin/rutinas", "/admin/ejercicios", "/admin/academia", "/academia", "/admin/aprende/glosario", "/admin/aprende/historia", "/aprende/glosario", "/aprende/historia"]) {
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
  const nombreRuta = (id || "app").normalize("NFD").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60);
  const ruta = `${destino}/${nombreRuta}-${Date.now()}.${TIPOS[archivo.type]}`;
  const { error } = await admin.storage
    .from("fotos")
    .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type, cacheControl: "31536000" });
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

// Encuadre de la foto de una tarjeta: qué parte se ve (posición en % de ancho y alto). Se guarda junto a la foto.
export async function guardarEncuadreFoto(id: string, x: number, y: number, destino: string = "card"): Promise<ResultadoFoto> {
  await requireAdmin();
  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !esDestino(destino)) return { ok: false, error: "Encuadre no válido." };
  const actual = await urlActual(destino, id);
  if (!actual) return { ok: false, error: "No tiene foto propia." };
  const url = conEncuadre(actual, Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  if (!(await guardarUrl(destino, id, url))) return { ok: false, error: "No se ha podido guardar." };
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

// ---------- Varias fotos en Portada y Saludo de Inicio ----------
// La primera sigue guardada como «portada» / «inicio»; las demás como «portada:abc123». Cada visita enseña una al azar.

export async function anadirFotoGaleria(formData: FormData): Promise<ResultadoFoto> {
  await requireAdmin();
  const destino = String(formData.get("destino") ?? "");
  const archivo = formData.get("foto");
  if (destino !== "portada" && destino !== "inicio") return { ok: false, error: "Destino no válido." };
  if (!(archivo instanceof File) || !(archivo.type in TIPOS) || archivo.size === 0 || archivo.size > MAX) {
    return { ok: false, error: "La foto debe ser jpg, png o webp y pesar menos de 1 MB." };
  }

  const admin = createAdminClient();
  const ruta = `${destino}/app-${Date.now()}.${TIPOS[archivo.type]}`;
  const { error } = await admin.storage
    .from("fotos")
    .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type, cacheControl: "31536000" });
  if (error) return { ok: false, error: "No se ha podido subir la foto." };
  const url = admin.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;

  // La primera foto ocupa el sitio de siempre; las siguientes llevan un sufijo.
  const { data: existe } = await admin.from("fotos_app").select("clave").eq("clave", destino).maybeSingle();
  const clave = existe ? `${destino}:${Date.now().toString(36)}` : destino;
  if ((await admin.from("fotos_app").upsert({ clave, url })).error) {
    await admin.storage.from("fotos").remove([ruta]);
    return { ok: false, error: "No se ha podido guardar la foto." };
  }
  repasar();
  return { ok: true, url };
}

export async function guardarEncuadreGaleria(clave: string, x: number, y: number): Promise<ResultadoFoto> {
  await requireAdmin();
  if (!/^(portada|inicio)(:[a-z0-9]+)?$/.test(clave) || !Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: "Foto no válida." };
  const admin = createAdminClient();
  const { data } = await admin.from("fotos_app").select("url").eq("clave", clave).maybeSingle();
  if (!data?.url) return { ok: false, error: "No se ha encontrado la foto." };
  const url = conEncuadre(data.url, Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  if ((await admin.from("fotos_app").update({ url }).eq("clave", clave)).error) return { ok: false, error: "No se ha podido guardar." };
  repasar();
  return { ok: true, url };
}

export async function quitarFotoGaleria(clave: string): Promise<ResultadoFoto> {
  await requireAdmin();
  if (!/^(portada|inicio)(:[a-z0-9]+)?$/.test(clave)) return { ok: false, error: "Foto no válida." };
  const admin = createAdminClient();
  const { data } = await admin.from("fotos_app").select("url").eq("clave", clave).maybeSingle();
  if ((await admin.from("fotos_app").delete().eq("clave", clave)).error) return { ok: false, error: "No se ha podido quitar." };
  await borrarArchivo(data?.url ?? null);
  repasar();
  return { ok: true, url: null };
}
