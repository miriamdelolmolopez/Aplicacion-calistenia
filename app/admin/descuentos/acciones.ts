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

export async function crearDescuento(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const tipo = String(formData.get("tipo") ?? "");
  const valorTexto = String(formData.get("valor") ?? "");
  const caducaTexto = String(formData.get("caduca_en") ?? "").trim();
  const usosTexto = String(formData.get("usos_max") ?? "").trim();

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

  const { error } = await createAdminClient().from("descuentos").insert({
    nombre,
    tipo,
    valor,
    caduca_en: caducaTexto === "" ? null : caducaTexto,
    usos_max: usos,
  });
  if (error) {
    return { error: error.code === "23505" ? "Ya hay un descuento con ese nombre." : "No se ha podido crear." };
  }
  refrescar();
  return { mensaje: "Descuento creado. Ya puedes elegirlo al registrar un bono." };
}

export async function cambiarActivo(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const activar = formData.get("activar") === "si";
  const { error } = await createAdminClient()
    .from("descuentos")
    .update({ activo: activar })
    .eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: "No se ha podido cambiar." };
  refrescar();
  return { mensaje: activar ? "Descuento activado." : "Descuento desactivado." };
}

// Solo se puede borrar si nunca se ha usado; si se usó, se desactiva (para no perder el rastro de los pagos).
export async function borrarDescuento(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  const { count } = await admin.from("pagos").select("id", { count: "exact", head: true }).eq("descuento_id", id);
  if ((count ?? 0) > 0) return { error: "Ya se ha usado en algún pago, así que no se puede borrar. Desactívalo." };

  const { error } = await admin.from("descuentos").delete().eq("id", id);
  if (error) return { error: "No se ha podido borrar." };
  refrescar();
  return { mensaje: "Descuento borrado." };
}
