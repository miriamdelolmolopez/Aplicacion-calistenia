"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { fijarInicioBono, inicioAltaValido } from "@/lib/altaBono";
import { claveDia, instanteMadrid } from "@/lib/fechas";
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

type Plazo = { importe: string; descuento: string; vence: string; desde: string; hasta: string; pagada: boolean };
type DescuentoFila = { id: string; tipo: string; valor: number; activo: boolean; caduca_en: string | null; usos_max: number | null };

// Lee y comprueba las cuotas que llegan del formulario (texto JSON). Sin cuotas, es un pago normal.
function leerPlazos(texto: string): { plazos: Plazo[] | null } | { error: string } {
  if (!texto.trim()) return { plazos: null };
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { error: "Las cuotas no son válidas. Vuelve a intentarlo." };
  }
  if (!Array.isArray(crudo) || crudo.length < 1 || crudo.length > 12) return { error: "Elige entre 1 y 12 cuotas." };
  const plazos: Plazo[] = [];
  for (const [i, x] of crudo.entries()) {
    const o = (x ?? {}) as Record<string, unknown>;
    const p: Plazo = { importe: String(o.importe ?? ""), descuento: String(o.descuento ?? ""), vence: String(o.vence ?? "").trim(), desde: String(o.desde ?? "").trim(), hasta: String(o.hasta ?? "").trim(), pagada: o.pagada === true };
    const euros = aCentimos(p.importe);
    if (!Number.isFinite(euros) || euros < 0) return { error: `El importe de la cuota ${i + 1} no es válido.` };
    if (p.descuento && !UUID.test(p.descuento)) return { error: `El descuento de la cuota ${i + 1} no es válido.` };
    if (!instanteMadrid(p.vence, "00:00")) return { error: `La fecha de vencimiento de la cuota ${i + 1} no es válida.` };
    // El periodo que cubre la cuota es opcional; si se pone, tiene que ser válido y acabar después de empezar.
    const d = p.desde ? instanteMadrid(p.desde, "00:00") : null;
    const h = p.hasta ? instanteMadrid(p.hasta, "00:00") : null;
    if ((p.desde && !d) || (p.hasta && !h)) return { error: `Las fechas del periodo de la cuota ${i + 1} no son válidas.` };
    if (d && h && h.getTime() < d.getTime()) return { error: `En la cuota ${i + 1}, el periodo tiene que acabar después de empezar.` };
    plazos.push(p);
  }
  return { plazos };
}

// Rebaja de un descuento sobre un importe (en céntimos).
function rebajaDe(d: DescuentoFila, bruto: number): number {
  return d.tipo === "porcentaje" ? Math.round((bruto * d.valor) / 100) : Math.min(d.valor, bruto);
}

// Comprueba que los descuentos elegidos en las cuotas existen, están activos, no han caducado y tienen usos libres para todas las cuotas.
async function comprobarDescuentos(admin: ReturnType<typeof createAdminClient>, plazos: Plazo[]): Promise<string | null> {
  const ids = [...new Set(plazos.map((p) => p.descuento).filter(Boolean))];
  if (ids.length === 0) return null;
  const { data } = await admin.from("descuentos").select("id, tipo, valor, activo, caduca_en, usos_max").in("id", ids);
  const hoy = claveDia(new Date().toISOString());
  for (const id of ids) {
    const d = ((data ?? []) as DescuentoFila[]).find((x) => x.id === id);
    if (!d || !d.activo) return "Uno de los descuentos ya no está disponible.";
    if (d.caduca_en && d.caduca_en < hoy) return "Uno de los descuentos ha caducado.";
    if (d.usos_max !== null) {
      const { count } = await admin.from("pagos").select("id", { count: "exact", head: true }).eq("descuento_id", id).neq("estado", "anulado");
      const enEstePlan = plazos.filter((p) => p.descuento === id).length;
      if ((count ?? 0) + enEstePlan > d.usos_max) return "Un descuento no tiene usos suficientes para todas las cuotas.";
    }
  }
  return null;
}

// Anota el vencimiento de la primera cuota y crea las demás (pendientes, o cobradas si se marcaron como pagadas).
async function crearCuotas(admin: ReturnType<typeof createAdminClient>, p: { userId: string; bonoId: string; adminId: string; metodo: string; instante: Date; plazos: Plazo[] }): Promise<string> {
  const total = p.plazos.length;
  const { data: primero } = await admin.from("pagos").select("id").eq("bono_id", p.bonoId).order("creado_en", { ascending: true }).limit(1).maybeSingle();
  if (primero) await admin.from("pagos").update({ vence_en: p.plazos[0].vence, cuota_n: 1, cuotas_total: total, cubre_desde: p.plazos[0].desde || null, cubre_hasta: p.plazos[0].hasta || null }).eq("id", primero.id);

  const ids = [...new Set(p.plazos.map((x) => x.descuento).filter(Boolean))];
  const { data: ds } = ids.length ? await admin.from("descuentos").select("id, tipo, valor, activo, caduca_en, usos_max").in("id", ids) : { data: [] };
  const descuentos = (ds ?? []) as DescuentoFila[];

  let cobradas = p.plazos[0].pagada ? 1 : 0;
  const fallos: string[] = [];
  for (let i = 1; i < total; i++) {
    const plazo = p.plazos[i];
    const bruto = aCentimos(plazo.importe);
    const d = plazo.descuento ? descuentos.find((x) => x.id === plazo.descuento) : undefined;
    const rebaja = d ? rebajaDe(d, bruto) : 0;
    const periodo = (plazo.desde || plazo.vence).slice(0, 7);
    const { data: nuevo, error } = await admin
      .from("pagos")
      .insert({ user_id: p.userId, bono_id: p.bonoId, importe_centimos: bruto - rebaja, importe_original_centimos: bruto, descuento_centimos: rebaja, descuento_id: d ? d.id : null, metodo: p.metodo, estado: "pendiente", periodo, vence_en: plazo.vence, cubre_desde: plazo.desde || null, cubre_hasta: plazo.hasta || null, cuota_n: i + 1, cuotas_total: total })
      .select("id")
      .single();
    if (error || !nuevo) {
      fallos.push(`la cuota ${i + 1}`);
      continue;
    }
    if (plazo.pagada) {
      const { error: falloCobro } = await admin.rpc("cobrar_pago", { p_pago: nuevo.id, p_pagado_en: p.instante.toISOString(), p_metodo: p.metodo, p_periodo: periodo, p_nota: "", p_admin: p.adminId });
      if (falloCobro) fallos.push(`el cobro de la cuota ${i + 1}`);
      else cobradas++;
    }
  }
  const base = `Pago a plazos creado: ${total} ${total === 1 ? "cuota" : "cuotas"}, ${cobradas} ${cobradas === 1 ? "cobrada" : "cobradas"} y ${total - cobradas} pendientes.`;
  return fallos.length ? `${base} No se pudo crear ${fallos.join(", ")}: añádela desde Nuevo manual.` : base;
}

// «Nuevo pago»: se elige la tarifa y se cobra (o se asigna sin cobrar, dejando el pago pendiente).
export async function pagoGuiado(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  let descuento = String(formData.get("descuento") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  let sinCobrar = formData.get("sinCobrar") === "on";
  // Pago a plazos: varias cuotas, cada una con su importe, descuento, vencimiento y si ya está pagada.
  const plazosLeidos = leerPlazos(String(formData.get("plazos") ?? ""));
  if ("error" in plazosLeidos) return { error: plazosLeidos.error };
  const plazos = plazosLeidos.plazos;
  if (plazos) {
    descuento = plazos[0].descuento;
    sinCobrar = !plazos[0].pagada;
  }
  const mes = Number(formData.get("mes"));
  const anio = Number(formData.get("anio"));
  const fin = String(formData.get("fin") ?? "").trim();
  const inicio = String(formData.get("inicio") ?? "").trim();
  if (!UUID.test(userId)) return { error: "No se ha podido identificar a la persona." };
  if (!UUID.test(tipo)) return { error: "Elige qué va a pagar." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  if (!(mes >= 1 && mes <= 12) || !(anio >= 2000 && anio <= 2100)) return { error: "El mes o el año al que corresponde no son válidos." };

  const importe = aCentimos(plazos ? plazos[0].importe : String(formData.get("importe") ?? ""));
  if (!Number.isFinite(importe) || importe < 0) return { error: "El importe no es válido." };

  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };
  const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
  const hastaFin = fin ? instanteMadrid(fin, "23:59") : null;
  if (fin && !hastaFin) return { error: "La fecha de fin no es válida." };
  if (inicio && !inicioAltaValido(inicio)) return { error: "La fecha de inicio del bono no es válida (puede ser pasada hasta dos años o futura hasta un año)." };
  const desdeInicio = inicio ? instanteMadrid(inicio, "00:00") : null;
  if (hastaFin && desdeInicio && hastaFin.getTime() <= desdeInicio.getTime()) return { error: "La fecha de fin tiene que ser posterior al inicio del bono." };
  if (hastaFin && !desdeInicio && hastaFin.getTime() <= c.instante.getTime()) return { error: "La fecha de fin tiene que ser posterior al día del pago." };
  const admin = createAdminClient();

  if (plazos) {
    const fallo = await comprobarDescuentos(admin, plazos);
    if (fallo) return { error: fallo };
  }

  const { data: tarifa } = await admin.from("tipos_bono").select("precio_centimos, servicio, servicio2").eq("id", tipo).maybeSingle();
  if (!tarifa) return { error: "No se ha encontrado esa tarifa." };

  // Si todavía es invitado/a (vino a probar), al añadirle un pago pasa a alumno/a con los servicios de esa tarifa:
  // no hace falta cambiarlo a mano antes. Si el pago falla, se deja como estaba.
  let ascendido = false;
  const serviciosNuevos: string[] = [];
  const { data: persona } = await admin.from("profiles").select("rol, alumno_desde").eq("id", userId).maybeSingle();
  if (persona?.rol === "invitado") {
    const { data: tiene } = await admin.from("perfil_servicios").select("servicio").eq("user_id", userId);
    const ya = new Set((tiene ?? []).map((s) => s.servicio as string));
    for (const s of [tarifa.servicio as string, tarifa.servicio2 as string | null]) if (s && !ya.has(s) && !serviciosNuevos.includes(s)) serviciosNuevos.push(s);
    const cambios: Record<string, unknown> = { rol: "alumno", fue_alumno: true };
    if (!persona.alumno_desde) cambios.alumno_desde = claveDia(new Date().toISOString());
    const { error: falloRol } = await admin.from("profiles").update(cambios).eq("id", userId).eq("rol", "invitado");
    if (falloRol) return { error: "No se ha podido pasar a alumno/a. Inténtalo de nuevo." };
    if (serviciosNuevos.length > 0) await admin.from("perfil_servicios").insert(serviciosNuevos.map((servicio) => ({ user_id: userId, servicio })));
    ascendido = true;
  }

  const { data: bonoId, error } = await admin.rpc("crear_bono", {
    p_user: userId,
    p_tipo: tipo,
    p_metodo: metodo,
    p_pagado: !sinCobrar,
    p_nota: "",
    p_admin: user.id,
    p_descuento: descuento || null,
    ...(plazos || importe !== (tarifa.precio_centimos as number) ? { p_precio: importe } : {}),
  });
  if (error) {
    if (ascendido) {
      // El pago no se ha podido crear: se deja a la persona como estaba (invitado/a y con sus servicios de antes).
      await admin.from("profiles").update({ rol: "invitado", ...(persona?.alumno_desde ? {} : { alumno_desde: null }) }).eq("id", userId);
      for (const s of serviciosNuevos) await admin.from("perfil_servicios").delete().eq("user_id", userId).eq("servicio", s);
    }
    return { error: error.message };
  }

  // La base de datos pone la fecha de ahora; se corrige con la elegida y se anota el mes al que corresponde.
  if (bonoId) {
    await admin
      .from("pagos")
      .update(sinCobrar ? { periodo } : { pagado_en: c.instante.toISOString(), periodo })
      .eq("bono_id", bonoId as string);
    // Inicio del bono distinto de hoy: se fija la fecha en que empieza (y su fin). Si es futuro, el bono espera y se activa ese día.
    if (inicio && inicio !== claveDia(new Date().toISOString())) {
      await fijarInicioBono(admin, bonoId as string, inicio, hastaFin);
    } else if (hastaFin) {
      // Fecha de fin elegida: se aplica a lo que ya está en marcha (lo que queda en espera toma su fecha al empezar).
      await admin
        .from("bonos")
        .update({ caduca_en: hastaFin.toISOString() })
        .eq("user_id", userId)
        .eq("tipo_bono_id", tipo)
        .eq("estado", "activo")
        .gte("creado_en", new Date(Date.now() - 60_000).toISOString());
    }
  }

  // Pago a plazos: la primera cuota ya existe; se anota su vencimiento y se crean las demás.
  let resumenPlazos = "";
  if (bonoId && plazos) resumenPlazos = await crearCuotas(admin, { userId, bonoId: bonoId as string, adminId: user.id, metodo, instante: c.instante, plazos });

  refrescar(userId);
  const pasoAAlumno = ascendido ? " Ahora es alumno/a (antes era invitado/a)." : "";
  return { mensaje: (plazos ? resumenPlazos : sinCobrar ? "Tarifa asignada. El pago queda pendiente de cobrar." : "Pago registrado y cobrado.") + pasoAAlumno };
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

// Cobrar de una vez todos los pagos pendientes de una persona (todas las cuotas que le queden), con la misma fecha y forma de pago.
export async function cobrarTodasPendientes(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const metodo = String(formData.get("metodo") ?? "");
  if (!UUID.test(userId)) return { error: "No se ha podido identificar a la persona." };
  if (!(await formaActiva(metodo))) return { error: "Elige la forma de pago." };
  const c = cuando(String(formData.get("fecha") ?? "").trim(), String(formData.get("hora") ?? "").trim());
  if ("error" in c) return { error: c.error };

  const admin = createAdminClient();
  const { data: pendientes } = await admin.from("pagos").select("id, periodo").eq("user_id", userId).eq("estado", "pendiente").order("vence_en", { ascending: true, nullsFirst: false });
  const lista = (pendientes ?? []) as { id: string; periodo: string | null }[];
  if (lista.length === 0) return { error: "No tiene nada pendiente de cobrar." };

  let cobrados = 0;
  for (const p of lista) {
    const { error } = await admin.rpc("cobrar_pago", { p_pago: p.id, p_pagado_en: c.instante.toISOString(), p_metodo: metodo, p_periodo: p.periodo ?? mesMadrid(c.instante), p_nota: "", p_admin: user.id });
    if (!error) cobrados++;
  }
  refrescar(userId);
  if (cobrados === 0) return { error: "No se ha podido cobrar ninguno. Inténtalo de nuevo." };
  return { mensaje: cobrados === lista.length ? `Cobrados los ${cobrados} pagos pendientes.` : `Se han cobrado ${cobrados} de ${lista.length} pagos pendientes. Revisa el resto en el historial.` };
}

// Cambiar la fecha de vencimiento de un pago pendiente (por ejemplo, si la persona pide pagar unos días más tarde).
export async function cambiarVencimiento(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const pagoId = String(formData.get("pagoId") ?? "");
  const vence = String(formData.get("vence") ?? "").trim();
  if (!UUID.test(userId) || !UUID.test(pagoId)) return { error: "No se ha encontrado ese pago." };
  if (!instanteMadrid(vence, "00:00")) return { error: "La fecha de vencimiento no es válida." };

  const admin = createAdminClient();
  const { data: p } = await admin.from("pagos").select("id, user_id, estado").eq("id", pagoId).maybeSingle();
  if (!p || p.user_id !== userId || p.estado !== "pendiente") return { error: "Solo se puede cambiar el vencimiento de un pago pendiente." };
  const { error } = await admin.from("pagos").update({ vence_en: vence }).eq("id", pagoId);
  if (error) return { error: "No se ha podido guardar el vencimiento." };
  // Si estaba pausada por este retraso, al cambiar la fecha puede volver a activarse.
  await admin.rpc("refrescar_bonos", { p_user: userId });
  refrescar(userId);
  return { mensaje: "Vencimiento cambiado." };
}
