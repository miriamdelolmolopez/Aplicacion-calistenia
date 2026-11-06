import "server-only";
import { instanteMadrid, sumarDias } from "./fechas";
import type { createAdminClient } from "./supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Fecha de inicio de un alta nueva: puede ser pasada (hasta dos años) o futura (hasta un año), por ejemplo el día de un taller.
export function inicioAltaValido(fecha: string): boolean {
  const d = instanteMadrid(fecha, "00:00");
  if (!d) return false;
  const ahora = Date.now();
  return d.getTime() >= ahora - 730 * 86_400_000 && d.getTime() <= ahora + 365 * 86_400_000;
}

// Pone la fecha en que empezó el bono (y la de caducidad que le corresponde). Vale también para el segundo bono de un combo.
// Si se da una fecha de fin, se usa en lugar de la que saldría por la validez de la tarifa (y se pone antes de comprobar caducidades).
export async function fijarInicioBono(admin: Admin, bonoId: string, fecha: string, hastaFin: Date | null = null) {
  const desde = instanteMadrid(fecha, "00:00");
  if (!desde) return;
  const { data: base } = await admin.from("bonos").select("user_id, tipo_bono_id, creado_en").eq("id", bonoId).maybeSingle();
  if (!base) return;
  const { data: bonos } = await admin.from("bonos").select("id, validez_dias").eq("user_id", base.user_id).eq("tipo_bono_id", base.tipo_bono_id).eq("creado_en", base.creado_en);
  for (const b of bonos ?? []) {
    // Se cuenta por días de calendario (en hora de Madrid), para que el cambio de hora no la mueva un día.
    const caduca = hastaFin ?? instanteMadrid(sumarDias(fecha, b.validez_dias as number), "00:00") ?? desde;
    await admin.from("bonos").update({ activo_desde: desde.toISOString(), caduca_en: caduca.toISOString() }).eq("id", b.id);
  }
  // Si empieza en el futuro, el bono espera (sin usar todavía) y se activa solo ese día.
  if (desde.getTime() > Date.now()) {
    const { data: grupo } = await admin.from("bonos").select("id, clases_total, clases_restantes, estado").eq("user_id", base.user_id).eq("tipo_bono_id", base.tipo_bono_id).eq("creado_en", base.creado_en);
    const sinUsar = (grupo ?? []).filter((b) => b.estado === "activo" && b.clases_restantes === b.clases_total).map((b) => b.id as string);
    if (sinUsar.length > 0) await admin.from("bonos").update({ estado: "en_cola" }).in("id", sinUsar);
  }
  await admin.rpc("refrescar_bonos", { p_user: base.user_id });
}

// Una tarifa ya comprobada, lista para dar de alta a una persona.
export type PlanTarifa = {
  tipoId: string;
  servicio: string;
  inicio: string; // aaaa-mm-dd o vacío (empieza hoy)
  hastaFin: Date | null;
  pagado: boolean;
  instantePago: Date;
  metodo: string;
  descuentoId: string | null;
  precioCentimos: number | null;
};

// Da de alta la tarifa (con su pago, pendiente o cobrado) y ajusta las fechas. Dice si ha salido bien.
export async function aplicarTarifa(admin: Admin, userId: string, adminId: string, p: PlanTarifa): Promise<{ ok: boolean }> {
  const { data: bonoNuevo, error } = await admin.rpc("crear_bono", {
    p_user: userId,
    p_tipo: p.tipoId,
    p_metodo: p.metodo,
    p_pagado: p.pagado,
    p_nota: "",
    p_admin: adminId,
    p_descuento: p.descuentoId,
    p_precio: p.precioCentimos,
  });
  if (error || !bonoNuevo) return { ok: false };
  if (p.inicio) await fijarInicioBono(admin, bonoNuevo as string, p.inicio, p.hastaFin);
  // La base de datos pone la fecha de ahora: se corrige con la elegida y se anota el mes al que corresponde.
  const periodo = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).format(p.instantePago).slice(0, 7);
  await admin
    .from("pagos")
    .update(p.pagado ? { pagado_en: p.instantePago.toISOString(), periodo } : { periodo })
    .eq("bono_id", bonoNuevo as string);
  if (p.hastaFin) {
    await admin
      .from("bonos")
      .update({ caduca_en: p.hastaFin.toISOString() })
      .eq("user_id", userId)
      .eq("tipo_bono_id", p.tipoId)
      .eq("estado", "activo")
      .gte("creado_en", new Date(Date.now() - 60_000).toISOString());
  }
  return { ok: true };
}
