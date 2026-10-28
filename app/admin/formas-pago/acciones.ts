"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

function refrescar() {
  revalidatePath("/admin/formas-pago");
  revalidatePath("/admin/bonos");
  revalidatePath("/admin/usuarios");
}

// Crea una forma de pago nueva o cambia nombre, orden y si está activa. Los pagos ya hechos no cambian.
export async function guardarFormaPago(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const clave = texto(formData, "clave");
  const nombre = texto(formData, "nombre");
  const orden = Number(texto(formData, "orden") || "0");
  const activa = formData.get("activa") === "on";

  if (nombre.length < 2 || nombre.length > 40) return { error: "El nombre debe tener entre 2 y 40 letras." };
  if (!Number.isInteger(orden) || orden < 0 || orden > 999) return { error: "El orden es un número entre 0 y 999." };

  const admin = createAdminClient();
  if (clave) {
    const { error } = await admin.from("formas_pago").update({ nombre, orden, activa }).eq("clave", clave);
    if (error) return { error: "No se ha podido guardar." };
  } else {
    // La clave interna se saca del nombre (sin tildes ni espacios) y no cambia aunque luego renombres la forma.
    let base = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);
    if (base.length < 2) base = "forma";
    const { data: existentes } = await admin.from("formas_pago").select("clave").like("clave", `${base}%`);
    const usadas = new Set((existentes ?? []).map((e) => e.clave as string));
    let nueva = base;
    for (let i = 2; usadas.has(nueva); i++) nueva = `${base}_${i}`;
    const { error } = await admin.from("formas_pago").insert({ clave: nueva, nombre, orden, activa });
    if (error) return { error: "No se ha podido crear." };
  }
  refrescar();
  return { mensaje: clave ? "Guardado." : "Forma de pago creada." };
}

// Copia una forma de pago (por ejemplo para crear «Tarjeta» a partir de «Bizum»).
export async function duplicarForma(clave: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: origen } = await admin.from("formas_pago").select("clave, nombre, orden, activa").eq("clave", clave).maybeSingle();
  if (!origen) return { error: "No se ha encontrado esa forma de pago." };

  const { data: existentes } = await admin.from("formas_pago").select("clave, nombre, orden");
  const claves = new Set((existentes ?? []).map((e) => e.clave as string));
  const nombres = new Set((existentes ?? []).map((e) => e.nombre as string));
  let nombre = `${origen.nombre} (copia)`;
  for (let n = 2; nombres.has(nombre); n++) nombre = `${origen.nombre} (copia ${n})`;
  let nueva = `${origen.clave}_copia`.slice(0, 30);
  for (let i = 2; claves.has(nueva); i++) nueva = `${origen.clave}_copia${i}`.slice(0, 30);
  const orden = Math.max(0, ...(existentes ?? []).map((e) => Number(e.orden) || 0)) + 1;

  const { error } = await admin.from("formas_pago").insert({ clave: nueva, nombre, orden, activa: origen.activa });
  if (error) return { error: "No se ha podido duplicar." };
  refrescar();
  return { mensaje: `Creada «${nombre}». Cámbiale el nombre.` };
}

// Solo se puede eliminar si nunca se ha usado en un pago; si se usó, se desactiva para conservar los pagos antiguos.
export async function eliminarForma(clave: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin.from("pagos").select("id", { count: "exact", head: true }).eq("metodo", clave);
  if ((count ?? 0) > 0) return { error: "Ya se ha usado en algún pago, así que no se puede eliminar. Edítala y desmarca «Activa»." };

  const { error } = await admin.from("formas_pago").delete().eq("clave", clave);
  if (error) return { error: "No se ha podido eliminar." };
  refrescar();
  return { mensaje: "Forma de pago eliminada." };
}
