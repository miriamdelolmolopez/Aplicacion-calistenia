"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { instanteMadrid } from "@/lib/fechas";
import { aCentimos } from "@/lib/formato";
import { formaActiva } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

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
  const pagado = true; // al registrar un pago, ya está cobrado
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!persona || !tipo) return { error: "Elige la persona y la tarifa." };
  if (!(await formaActiva(metodo))) return { error: "Elige cómo paga." };
  const descuento = String(formData.get("descuento") ?? "");
  // Fecha y hora del cobro (en hora de Madrid). Si no se pone nada, es ahora mismo.
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const cobradoEn = fecha && hora ? instanteMadrid(fecha, hora) : null;
  if (pagado && fecha && hora && !cobradoEn) return { error: "La fecha o la hora del pago no son válidas." };
  if (cobradoEn && cobradoEn.getTime() > Date.now() + 60_000) return { error: "La fecha del pago no puede ser futura." };

  const admin = createAdminClient();
  const { data: bonoId, error: fallo } = await admin.rpc("crear_bono", {
    p_user: persona,
    p_tipo: tipo,
    p_metodo: metodo,
    p_pagado: pagado,
    p_nota: nota,
    p_admin: user.id,
    p_descuento: descuento || null,
  });
  if (fallo) return error(fallo.message);

  // La base de datos pone la fecha de hoy; si has indicado otra, se corrige en el pago de ese bono.
  if (bonoId) {
    const periodo = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).format(cobradoEn ?? new Date()).slice(0, 7);
    await admin
      .from("pagos")
      .update(pagado && cobradoEn ? { pagado_en: cobradoEn.toISOString(), periodo } : { periodo })
      .eq("bono_id", bonoId);
  }

  revalidatePath("/admin/bonos");
  return {
    mensaje: "Pago registrado y cobrado.",
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
  revalidatePath("/admin/usuarios", "layout");
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
  revalidatePath("/admin/usuarios", "layout");
  return { mensaje: "Tarifa quitada: el bono queda anulado." };
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
