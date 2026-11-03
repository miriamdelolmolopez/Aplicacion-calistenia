"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { instanteMadrid } from "@/lib/fechas";
import { aCentimos } from "@/lib/formato";
import { formaActiva } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../../../acciones";

const UUID = /^[0-9a-f-]{36}$/i;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

// Mes (AAAA-MM) de un instante, en hora de Madrid.
function mesMadrid(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).format(d).slice(0, 7);
}

function refrescar(userId: string) {
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath(`/admin/usuarios/${userId}/pagos`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/bonos");
}

// Fecha y hora del cobro. Si están vacías es ahora mismo; no puede ser futura.
function cuando(fecha: string, hora: string): { instante: Date } | { error: string } {
  if (!fecha && !hora) return { instante: new Date() };
  const d = instanteMadrid(fecha, hora);
  if (!d) return { error: "La fecha o la hora del pago no son válidas." };
  if (d.getTime() > Date.now() + 60_000) return { error: "La fecha del pago no puede ser futura." };
  return { instante: d };
}

// «Nuevo pago»: se elige la tarifa y se cobra (o se asigna sin cobrar, dejando el pago pendiente).
export async function pagoGuiado(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const descuento = String(formData.get("descuento") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  const sinCobrar = formData.get("sinCobrar") === "on";
  const mes = Number(formData.get("mes"));
  const anio = Number(formData.get("anio"));
  const fin = String(formData.get("fin") ?? "").trim();
  if (!UUID.test(userId)) return { error: "No se ha podido identificar a la persona." };
  if (!UUID.test(tipo)) return { error: "Elige qué va a pagar." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  if (!(mes >= 1 && mes <= 12) || !(anio >= 2000 && anio <= 2100)) return { error: "El mes o el año al que corresponde no son válidos." };

  const importe = aCentimos(String(formData.get("importe") ?? ""));
  if (!Number.isFinite(importe) || importe < 0) return { error: "El importe no es válido." };

  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };
  const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
  const hastaFin = fin ? instanteMadrid(fin, "23:59") : null;
  if (fin && !hastaFin) return { error: "La fecha de fin no es válida." };
  if (hastaFin && hastaFin.getTime() <= c.instante.getTime()) return { error: "La fecha de fin tiene que ser posterior al día del pago." };
  const admin = createAdminClient();

  const { data: tarifa } = await admin.from("tipos_bono").select("precio_centimos").eq("id", tipo).maybeSingle();
  if (!tarifa) return { error: "No se ha encontrado esa tarifa." };

  const { data: bonoId, error } = await admin.rpc("crear_bono", {
    p_user: userId,
    p_tipo: tipo,
    p_metodo: metodo,
    p_pagado: !sinCobrar,
    p_nota: "",
    p_admin: user.id,
    p_descuento: descuento || null,
    ...(importe !== (tarifa.precio_centimos as number) ? { p_precio: importe } : {}),
  });
  if (error) return { error: error.message };

  // La base de datos pone la fecha de ahora; se corrige con la elegida y se anota el mes al que corresponde.
  if (bonoId) {
    await admin
      .from("pagos")
      .update(sinCobrar ? { periodo } : { pagado_en: c.instante.toISOString(), periodo })
      .eq("bono_id", bonoId as string);
    // Fecha de fin elegida: se aplica a lo que ya está en marcha (lo que queda en espera toma su fecha al empezar).
    if (hastaFin) {
      await admin
        .from("bonos")
        .update({ caduca_en: hastaFin.toISOString() })
        .eq("user_id", userId)
        .eq("tipo_bono_id", tipo)
        .eq("estado", "activo")
        .gte("creado_en", new Date(Date.now() - 60_000).toISOString());
    }
  }

  refrescar(userId);
  return { mensaje: sinCobrar ? "Tarifa asignada. El pago queda pendiente de cobrar." : "Pago registrado y cobrado." };
}

// Cobrar un pago pendiente desde el historial, con la fecha, hora y forma que se elijan.
export async function cobrarPendiente(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const pagoId = String(formData.get("pagoId") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!UUID.test(userId) || !UUID.test(pagoId)) return { error: "No se ha encontrado ese pago." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };

  const admin = createAdminClient();
  const { data: p } = await admin.from("pagos").select("id, user_id").eq("id", pagoId).maybeSingle();
  if (!p || p.user_id !== userId) return { error: "No se ha encontrado ese pago." };

  const { error } = await admin.rpc("cobrar_pago", { p_pago: pagoId, p_pagado_en: c.instante.toISOString(), p_metodo: metodo, p_periodo: mesMadrid(c.instante), p_nota: nota, p_admin: user.id });
  if (error) return { error: error.message };
  refrescar(userId);
  return { mensaje: "Pago cobrado." };
}

// Anular un pago (aunque ya esté cobrado). El bono no se toca: para quitarlo está «Quitar tarifa».
export async function anularPagoPersona(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const pagoId = String(formData.get("pagoId") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!UUID.test(userId) || !UUID.test(pagoId)) return { error: "No se ha encontrado ese pago." };

  const admin = createAdminClient();
  const { data: p } = await admin.from("pagos").select("id, user_id, bono_id").eq("id", pagoId).maybeSingle();
  if (!p || p.user_id !== userId) return { error: "No se ha encontrado ese pago." };

  const { error } = await admin.rpc("anular_pago", { p_pago: pagoId, p_nota: nota, p_admin: user.id });
  if (error) return { error: error.message };

  // Si la tarifa de ese pago todavía no había empezado (está «en cola») y no le queda ningún otro pago vivo, se quita también:
  // si no, se activaría sola más adelante y daría clases sin que haya un pago.
  let quitada = false;
  if (p.bono_id) {
    const { data: bono } = await admin.from("bonos").select("estado").eq("id", p.bono_id).maybeSingle();
    const { count: vivos } = await admin.from("pagos").select("id", { count: "exact", head: true }).eq("bono_id", p.bono_id).neq("estado", "anulado");
    if (bono?.estado === "en_cola" && (vivos ?? 0) === 0) {
      const { error: falloBono } = await admin.rpc("anular_bono", { p_bono: p.bono_id, p_nota: "Pago anulado: la tarifa no había empezado", p_admin: user.id });
      quitada = !falloBono;
    }
  }
  refrescar(userId);
  return { mensaje: quitada ? "Pago anulado. Como su tarifa todavía no había empezado, también se ha quitado." : "Pago anulado." };
}

// «Nuevo manual»: un pago a mano (concepto e importe libres), con el mes al que corresponde y, si se quiere, sumar créditos o mover la fecha de fin de un bono.
export async function pagoManual(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const concepto = String(formData.get("concepto") ?? "").trim().slice(0, 120);
  const importe = aCentimos(String(formData.get("importe") ?? ""));
  const metodo = String(formData.get("metodo") ?? "");
  const bonoId = String(formData.get("bonoId") ?? "");
  const clases = Number(String(formData.get("clases") ?? "0").trim() || "0");
  const nuevaFin = String(formData.get("nuevaFin") ?? "").trim();
  if (!UUID.test(userId)) return { error: "No se ha podido identificar a la persona." };
  if (!concepto) return { error: "Escribe el concepto del pago." };
  if (Number.isNaN(importe)) return { error: "El importe no es válido (por ejemplo 15 o 15,50)." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  if (!Number.isInteger(clases) || Math.abs(clases) > 50) return { error: "Los créditos tienen que ser un número entero." };

  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };
  const mesElegido = String(formData.get("mes") ?? "");
  const periodo = MES.test(mesElegido) ? mesElegido : mesMadrid(c.instante);

  const admin = createAdminClient();
  if (bonoId) {
    if (!UUID.test(bonoId)) return { error: "El bono no es válido." };
    const { data: b } = await admin.from("bonos").select("id, user_id").eq("id", bonoId).maybeSingle();
    if (!b || b.user_id !== userId) return { error: "No se ha encontrado ese bono." };
  } else if (clases !== 0 || nuevaFin) {
    return { error: "Para sumar créditos o cambiar la fecha de fin hay que elegir un bono." };
  }

  const { error } = await admin.from("pagos").insert({
    user_id: userId,
    bono_id: bonoId || null,
    importe_centimos: importe,
    importe_original_centimos: importe,
    descuento_centimos: 0,
    metodo,
    estado: "pagado",
    pagado_en: c.instante.toISOString(),
    periodo,
    nota: concepto,
  });
  if (error) return { error: "No se ha podido guardar el pago." };

  const avisos: string[] = [];
  if (bonoId && clases !== 0) {
    const { error: e } = await admin.rpc("ajustar_bono", { p_bono: bonoId, p_clases: clases, p_dias: 0, p_nota: concepto, p_admin: user.id });
    if (e) avisos.push(`No se pudieron sumar los créditos: ${e.message}`);
  }
  if (bonoId && nuevaFin) {
    const hasta = instanteMadrid(nuevaFin, "00:00");
    if (!hasta) avisos.push("La nueva fecha de fin no es válida.");
    else {
      const { error: e } = await admin.rpc("cambiar_bono", { p_bono: bonoId, p_tipo: null, p_desde: null, p_hasta: hasta.toISOString(), p_nota: concepto, p_admin: user.id });
      if (e) avisos.push(`No se pudo cambiar la fecha de fin: ${e.message}`);
    }
  }

  refrescar(userId);
  return avisos.length > 0 ? { error: `Pago guardado, pero: ${avisos.join(" ")}` } : { mensaje: "Pago guardado." };
}

// Precio fijo personalizado: el precio de una tarifa para esta persona.
export async function guardarPrecioPersonalizado(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const precio = aCentimos(String(formData.get("precio") ?? ""));
  if (!UUID.test(userId) || !UUID.test(tipo)) return { error: "Elige la tarifa." };
  if (Number.isNaN(precio)) return { error: "El precio no es válido (por ejemplo 70 o 70,50)." };

  const { error } = await createAdminClient()
    .from("precios_personalizados")
    .upsert({ user_id: userId, tipo_bono_id: tipo, precio_centimos: precio, actualizado_en: new Date().toISOString() });
  if (error) return { error: "No se ha podido guardar." };
  refrescar(userId);
  return { mensaje: "Precio personalizado guardado." };
}

export async function quitarPrecioPersonalizado(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  if (!UUID.test(userId) || !UUID.test(tipo)) return { error: "No se ha encontrado ese precio." };
  const { error } = await createAdminClient().from("precios_personalizados").delete().eq("user_id", userId).eq("tipo_bono_id", tipo);
  if (error) return { error: "No se ha podido quitar." };
  refrescar(userId);
  return { mensaje: "Precio personalizado quitado: vuelve a pagar el precio normal." };
}

// Editar un pago cobrado: día, hora, forma de pago, nota e importe.
// Si el importe cambia y el pago ya tenía factura, se anula con su rectificativa y se crea otro pago con el importe nuevo (y su factura nueva).
export async function editarPago(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const pagoId = String(formData.get("pagoId") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  const importe = aCentimos(String(formData.get("importe") ?? ""));
  if (!UUID.test(userId) || !UUID.test(pagoId)) return { error: "No se ha encontrado ese pago." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  if (!Number.isFinite(importe) || importe <= 0 || importe > 1_000_000) return { error: "El importe no es válido." };
  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };

  const admin = createAdminClient();
  const { data: p } = await admin.from("pagos").select("id, user_id, bono_id, estado, importe_centimos").eq("id", pagoId).maybeSingle();
  if (!p || p.user_id !== userId) return { error: "No se ha encontrado ese pago." };
  if (p.estado !== "pagado") return { error: "Solo se puede editar un pago cobrado." };

  const periodo = mesMadrid(c.instante);
  const cambiaImporte = importe !== p.importe_centimos;
  const { data: factura } = await admin.from("facturas").select("id").eq("pago_id", pagoId).eq("tipo", "normal").maybeSingle();

  if (cambiaImporte && factura) {
    const nuevo = await admin
      .from("pagos")
      .insert({ user_id: userId, bono_id: p.bono_id, importe_centimos: importe, metodo, estado: "pagado", pagado_en: c.instante.toISOString(), periodo, nota: nota || "Corrige un pago anterior" })
      .select("id")
      .single();
    if (nuevo.error) return { error: "No se ha podido crear el pago corregido." };
    const { error } = await admin.rpc("anular_pago", { p_pago: pagoId, p_nota: "Importe corregido", p_admin: user.id });
    if (error) {
      await admin.from("pagos").delete().eq("id", nuevo.data.id);
      return { error: error.message };
    }
    refrescar(userId);
    return { mensaje: "Importe corregido: el pago anterior queda anulado con su factura rectificativa y hay una factura nueva." };
  }

  const { error } = await admin
    .from("pagos")
    .update({
      pagado_en: c.instante.toISOString(),
      metodo,
      periodo,
      nota: nota || null,
      ...(cambiaImporte ? { importe_centimos: importe, importe_original_centimos: null, descuento_centimos: 0 } : {}),
    })
    .eq("id", pagoId);
  if (error) return { error: "No se ha podido guardar." };
  refrescar(userId);
  return { mensaje: "Pago actualizado." };
}
