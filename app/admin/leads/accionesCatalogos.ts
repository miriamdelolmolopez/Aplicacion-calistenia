"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { colorValido, type ItemColor } from "./tipos";

// Las listas editables de cada entrenador: sus etiquetas, sus tipos de lead y sus estados. Cada acción cambia un solo elemento (como en Notion).
export type TablaLista = "etiquetas" | "tipos" | "estados";
const TABLAS: Record<TablaLista, string> = { etiquetas: "leads_etiquetas", tipos: "leads_tipos", estados: "leads_estados" };
const MAXIMO = 40;
const UUID = /^[0-9a-f-]{36}$/i;
type Resultado = { ok: boolean; error?: string; item?: ItemColor };

const columnas = (tabla: TablaLista) => (tabla === "estados" ? "id, nombre, color, orden, es_ganado" : "id, nombre, color, orden");
const limpiarNombre = (n: unknown) => String(n ?? "").trim().slice(0, 40);

// Crea un elemento nuevo al final de la lista.
export async function crearElemento(tabla: TablaLista, nombre: string, color: string): Promise<Resultado> {
  const { user } = await requireAdmin("leads");
  if (!(tabla in TABLAS)) return { ok: false, error: "Lista no válida." };
  const limpio = limpiarNombre(nombre);
  if (!limpio) return { ok: false, error: "Escribe un nombre." };
  const admin = createAdminClient();
  const { data: existentes } = await admin.from(TABLAS[tabla]).select("nombre, orden").eq("entrenador_id", user.id);
  const lista = (existentes ?? []) as { nombre: string; orden: number }[];
  if (lista.length >= MAXIMO) return { ok: false, error: `Ya hay ${MAXIMO} (el máximo). Quita alguno.` };
  if (lista.some((e) => e.nombre.toLowerCase() === limpio.toLowerCase())) return { ok: false, error: "Ya existe uno con ese nombre." };
  const orden = lista.reduce((m, e) => Math.max(m, e.orden), -1) + 1;
  const { data, error } = await admin
    .from(TABLAS[tabla])
    .insert({ entrenador_id: user.id, nombre: limpio, color: colorValido(String(color)) ? String(color) : "gris", orden })
    .select(columnas(tabla))
    .single();
  if (error || !data) return { ok: false, error: "No se ha podido crear." };
  revalidatePath("/admin/leads");
  return { ok: true, item: data as unknown as ItemColor };
}

// Cambia el nombre y/o el color de un elemento.
export async function actualizarElemento(tabla: TablaLista, id: string, cambios: { nombre?: string; color?: string }): Promise<Resultado> {
  const { user } = await requireAdmin("leads");
  if (!(tabla in TABLAS) || !UUID.test(id)) return { ok: false, error: "No se ha encontrado." };
  const nuevo: Record<string, string> = {};
  if (cambios.nombre !== undefined) {
    const limpio = limpiarNombre(cambios.nombre);
    if (!limpio) return { ok: false, error: "El nombre no puede quedar vacío." };
    nuevo.nombre = limpio;
  }
  if (cambios.color !== undefined) nuevo.color = colorValido(String(cambios.color)) ? String(cambios.color) : "gris";
  if (Object.keys(nuevo).length === 0) return { ok: true };
  const { data, error } = await createAdminClient().from(TABLAS[tabla]).update(nuevo).eq("id", id).eq("entrenador_id", user.id).select(columnas(tabla)).maybeSingle();
  if (error) return { ok: false, error: error.code === "23505" ? "Ya existe uno con ese nombre." : "No se ha podido guardar." };
  if (!data) return { ok: false, error: "No se ha encontrado." };
  revalidatePath("/admin/leads");
  return { ok: true, item: data as unknown as ItemColor };
}

// Elimina un elemento. Una etiqueta desaparece de los leads que la tenían; un tipo deja a esos leads sin tipo;
// un estado solo se puede quitar si ningún lead lo usa y si no es el único que queda.
export async function eliminarElemento(tabla: TablaLista, id: string): Promise<Resultado> {
  const { user } = await requireAdmin("leads");
  if (!(tabla in TABLAS) || !UUID.test(id)) return { ok: false, error: "No se ha encontrado." };
  const admin = createAdminClient();
  if (tabla === "estados") {
    const { count: total } = await admin.from("leads_estados").select("id", { count: "exact", head: true }).eq("entrenador_id", user.id);
    if ((total ?? 0) <= 1) return { ok: false, error: "Tiene que quedar al menos un estado." };
    const { count: usados } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("entrenador_id", user.id).eq("estado_id", id);
    if ((usados ?? 0) > 0) return { ok: false, error: "Hay leads con este estado. Cámbialos de estado antes de quitarlo." };
  }
  if (tabla === "etiquetas") {
    const { data: leads } = await admin.from("leads").select("id, etiqueta_ids").eq("entrenador_id", user.id).overlaps("etiqueta_ids", [id]);
    for (const l of (leads ?? []) as { id: string; etiqueta_ids: string[] }[]) {
      await admin.from("leads").update({ etiqueta_ids: l.etiqueta_ids.filter((x) => x !== id) }).eq("id", l.id).eq("entrenador_id", user.id);
    }
  }
  const { error } = await admin.from(TABLAS[tabla]).delete().eq("id", id).eq("entrenador_id", user.id);
  if (error) return { ok: false, error: "No se ha podido eliminar." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

// Guarda el orden de la lista (los identificadores, de arriba abajo).
export async function ordenarElementos(tabla: TablaLista, ids: string[]): Promise<Resultado> {
  const { user } = await requireAdmin("leads");
  if (!(tabla in TABLAS)) return { ok: false, error: "Lista no válida." };
  const limpios = ids.filter((x) => UUID.test(x)).slice(0, MAXIMO);
  const admin = createAdminClient();
  for (const [orden, id] of limpios.entries()) {
    const { error } = await admin.from(TABLAS[tabla]).update({ orden }).eq("id", id).eq("entrenador_id", user.id);
    if (error) return { ok: false, error: "No se ha podido guardar el orden." };
  }
  revalidatePath("/admin/leads");
  return { ok: true };
}
