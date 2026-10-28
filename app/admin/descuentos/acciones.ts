"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { aCentimos } from "@/lib/formato";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function refrescar() {
  revalidatePath("/admin/descuentos");
  revalidatePath("/admin/bonos");
}

// Crea un descuento nuevo o, si viene con «id», cambia uno existente. Los pagos ya hechos no cambian.
export async function guardarDescuento(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const tipo = String(formData.get("tipo") ?? "");
  const valorTexto = String(formData.get("valor") ?? "");
  const caducaTexto = String(formData.get("caduca_en") ?? "").trim();
  const usosTexto = String(formData.get("usos_max") ?? "").trim();
  const activo = formData.get("activo") === "on";

  if (nombre.length < 1 || nombre.length > 60) return { error: "Escribe un nombre (hasta 60 letras)." };
  if (tipo !== "porcentaje" && tipo !== "euros") return { error: "Elige si es en % o en euros." };

  let valor: number;
  if (tipo === "porcentaje") {
    valor = Number(valorTexto.replace(",", "."));
    if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
      return { error: "El porcentaje tiene que ser un número entero entre 1 y 100." };
    }
  } else {
    valor = aCentimos(valorTexto);
    if (!Number.isFinite(valor) || valor < 1) return { error: "Escribe un importe en euros, por ejemplo 10 o 7,50." };
  }

  if (caducaTexto !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(caducaTexto)) return { error: "La fecha no es válida." };
  const usos = usosTexto === "" ? null : Number(usosTexto);
  if (usos !== null && (!Number.isInteger(usos) || usos < 1 || usos > 10000)) {
    return { error: "El máximo de usos tiene que ser un número entero mayor que 0 (o déjalo vacío)." };
  }

  const datos = { nombre, tipo, valor, caduca_en: caducaTexto === "" ? null : caducaTexto, usos_max: usos, activo };
  const admin = createAdminClient();
  const { error } = id ? await admin.from("descuentos").update(datos).eq("id", id) : await admin.from("descuentos").insert(datos);
  if (error) {
    return { error: error.code === "23505" ? "Ya hay un descuento con ese nombre." : "No se ha podido guardar." };
  }
  refrescar();
  return { mensaje: id ? "Guardado." : "Descuento creado. Ya puedes elegirlo al registrar un pago." };
}

// Copia un descuento para no empezar de cero.
export async function duplicarDescuento(id: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: origen } = await admin.from("descuentos").select("nombre, tipo, valor, caduca_en, usos_max, activo").eq("id", id).maybeSingle();
  if (!origen) return { error: "No se ha encontrado ese descuento." };

  const { data: existentes } = await admin.from("descuentos").select("nombre");
  const nombres = new Set((existentes ?? []).map((e) => e.nombre));
  let nombre = `${origen.nombre} (copia)`;
  for (let n = 2; nombres.has(nombre); n++) nombre = `${origen.nombre} (copia ${n})`;

  const { error } = await admin.from("descuentos").insert({ ...origen, nombre });
  if (error) return { error: "No se ha podido duplicar." };
  refrescar();
  return { mensaje: `Creado «${nombre}». Cámbiale lo que haga falta.` };
}

// Solo se puede eliminar si nunca se ha usado; si se usó, se desactiva (para no perder el rastro de los pagos).
export async function eliminarDescuento(id: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin.from("pagos").select("id", { count: "exact", head: true }).eq("descuento_id", id);
  if ((count ?? 0) > 0) return { error: "Ya se ha usado en algún pago, así que no se puede eliminar. Edítalo y desmarca «Activo»." };

  const { error } = await admin.from("descuentos").delete().eq("id", id);
  if (error) return { error: "No se ha podido eliminar." };
  refrescar();
  return { mensaje: "Descuento eliminado." };
}
