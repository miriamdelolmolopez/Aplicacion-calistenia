"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { aCentimos } from "@/lib/formato";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const METODOS = ["efectivo", "bizum", "transferencia"];

function entero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim();
  if (texto === "") return 0;
  const n = Number(texto);
  return Number.isInteger(n) ? n : NaN;
}

function error(mensaje: string | undefined): Estado {
  // Los mensajes de la base de datos para estos casos están en español.
  return { error: mensaje || "No se ha podido guardar." };
}

export async function registrarBono(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const persona = String(formData.get("persona") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  const pagado = formData.get("pagado") === "on";
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!persona || !tipo) return { error: "Elige la persona y el bono." };
  if (!METODOS.includes(metodo)) return { error: "Elige cómo paga." };
  const descuento = String(formData.get("descuento") ?? "");

  const { error: fallo } = await createAdminClient().rpc("crear_bono", {
    p_user: persona,
    p_tipo: tipo,
    p_metodo: metodo,
    p_pagado: pagado,
    p_nota: nota,
    p_admin: user.id,
    p_descuento: descuento || null,
  });
  if (fallo) return error(fallo.message);

  revalidatePath("/admin/bonos");
  return {
    mensaje: pagado
      ? "Bono registrado y cobrado."
      : "Bono registrado. El pago queda pendiente de cobrar.",
  };
}

export async function marcarPagado(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const { error: fallo } = await createAdminClient().rpc("marcar_pagado", {
    p_pago: String(formData.get("pagoId") ?? ""),
    p_admin: user.id,
  });
  if (fallo) return error(fallo.message);

  revalidatePath("/admin/bonos");
  return { mensaje: "Pago marcado como cobrado." };
}

export async function ajustarBono(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const clases = entero(formData.get("clases"));
  const dias = entero(formData.get("dias"));
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (Number.isNaN(clases) || Number.isNaN(dias)) return { error: "Escribe números enteros." };
  if (clases === 0 && dias === 0) return { error: "No has cambiado nada." };
  if (Math.abs(clases) > 50 || Math.abs(dias) > 365) return { error: "Cantidad demasiado grande." };

  const { error: fallo } = await createAdminClient().rpc("ajustar_bono", {
    p_bono: String(formData.get("bonoId") ?? ""),
    p_clases: clases,
    p_dias: dias,
    p_nota: nota,
    p_admin: user.id,
  });
  if (fallo) return error(fallo.message);

  revalidatePath("/admin/bonos");
  return { mensaje: "Ajuste guardado." };
}

export async function anularBono(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const { error: fallo } = await createAdminClient().rpc("anular_bono", {
    p_bono: String(formData.get("bonoId") ?? ""),
    p_nota: String(formData.get("nota") ?? "").trim().slice(0, 200),
    p_admin: user.id,
  });
  if (fallo) return error(fallo.message);

  revalidatePath("/admin/bonos");
  return { mensaje: "Bono anulado." };
}

export async function cambiarPrecio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const precio = aCentimos(String(formData.get("precio") ?? ""));
  if (Number.isNaN(precio) || precio > 100000) return { error: "Escribe un precio válido, por ejemplo 55 o 55,50." };

  const { error: fallo } = await createAdminClient()
    .from("tipos_bono")
    .update({ precio_centimos: precio })
    .eq("id", String(formData.get("tipoId") ?? ""));
  if (fallo) return error(fallo.message);

  revalidatePath("/admin/bonos");
  return { mensaje: "Precio guardado (los bonos ya registrados no cambian)." };
}
