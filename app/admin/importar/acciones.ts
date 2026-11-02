"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { aplicarTarifa, inicioAltaValido, type PlanTarifa } from "@/lib/altaBono";
import { enviarCorreo } from "@/lib/email";
import { claveDia, instanteMadrid, sumarDias } from "@/lib/fechas";
import { todasLasFormas } from "@/lib/formasPago";
import { clave, CORREO_VALIDO, type FilaImport } from "@/lib/importar";
import { correoInvitacion } from "@/lib/plantillas-email";
import { invitar } from "@/lib/registro";
import { createAdminClient } from "@/lib/supabase/admin";

const SERVICIOS = ["grupal", "individual", "online", "taller"];

export type ResultadoFila = { correo: string; ok: boolean; mensaje: string; enlace?: string };

type Catalogos = {
  tarifas: { id: string; nombre: string; servicio: string }[];
  formas: { clave: string; nombre: string }[];
  descuentos: { id: string; nombre: string }[];
  metodoPorDefecto: string;
};

async function cargarCatalogos(): Promise<Catalogos> {
  const admin = createAdminClient();
  const hoy = claveDia(new Date().toISOString());
  const [{ data: tarifas }, formas, { data: descuentos }] = await Promise.all([
    admin.from("tipos_bono").select("id, nombre, servicio").eq("activo", true),
    todasLasFormas(),
    admin.from("descuentos").select("id, nombre, caduca_en").eq("activo", true),
  ]);
  const activas = formas.filter((f) => f.activa);
  return {
    tarifas: (tarifas ?? []) as Catalogos["tarifas"],
    formas: activas.map(({ clave, nombre }) => ({ clave, nombre })),
    descuentos: ((descuentos ?? []) as { id: string; nombre: string; caduca_en: string | null }[]).filter((d) => d.caduca_en === null || d.caduca_en >= hoy),
    metodoPorDefecto: activas[0]?.clave ?? "",
  };
}

// Comprueba la tarifa y el pago de una fila contra lo que hay en la app. Sin tarifa, no hay nada que preparar.
function preparar(f: FilaImport, cat: Catalogos): { error: string } | { plan: PlanTarifa | null } {
  if (f.tipo !== "alumno" || !f.tarifa) return { plan: null };
  const tarifa = cat.tarifas.find((t) => clave(t.nombre) === clave(f.tarifa));
  if (!tarifa) return { error: `No existe la tarifa «${f.tarifa}». Escríbela tal como está en Tarifas.` };

  if (f.inicio && !inicioAltaValido(f.inicio)) return { error: "La fecha de inicio no es válida (como mucho 2 años atrás o 1 año adelante)." };
  const hoy = claveDia(new Date().toISOString());
  const hastaFin = f.fin ? instanteMadrid(f.fin, "23:59") : f.dias ? instanteMadrid(sumarDias(f.inicio || hoy, Number(f.dias)), "23:59") : null;
  if (f.fin && !hastaFin) return { error: "La fecha de fin no es válida." };

  const pagado = f.pagado === true;
  let metodo = cat.metodoPorDefecto;
  let instantePago = new Date();
  if (pagado) {
    const forma = f.formaPago ? cat.formas.find((x) => clave(x.nombre) === clave(f.formaPago) || clave(x.clave) === clave(f.formaPago)) : undefined;
    if (!forma) return { error: f.formaPago ? `No existe la forma de pago «${f.formaPago}».` : "Falta la forma de pago (está marcado como pagado)." };
    metodo = forma.clave;
    if (f.fechaPago) {
      const d = instanteMadrid(f.fechaPago, f.horaPago || "00:00");
      if (!d) return { error: "La fecha o la hora del pago no son válidas." };
      if (d.getTime() > Date.now() + 60_000) return { error: "La fecha y la hora del pago no pueden ser futuras." };
      instantePago = d;
    }
  }

  let descuentoId: string | null = null;
  if (f.descuento) {
    const d = cat.descuentos.find((x) => clave(x.nombre) === clave(f.descuento));
    if (!d) return { error: `No existe el descuento «${f.descuento}» (o está caducado).` };
    descuentoId = d.id;
  }
  const precioCentimos = f.importe ? Math.round(Number(f.importe) * 100) : null;

  return { plan: { tipoId: tarifa.id, servicio: tarifa.servicio, inicio: f.inicio, hastaFin, pagado, instantePago, metodo, descuentoId, precioCentimos } };
}

const normalizarDni = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

// Antes de importar: por cada correo, lo que impide hacerlo (tarifa o forma de pago que no existen, DNI repetido…)
// y quién ya tiene cuenta (a esas personas solo se les completa lo que les falta).
export async function comprobarFilas(filas: FilaImport[]): Promise<{ problemas: Record<string, string[]>; existentes: string[] }> {
  await requireAdmin("importar");
  const admin = createAdminClient();
  const cat = await cargarCatalogos();
  const problemas: Record<string, string[]> = {};
  const anota = (correo: string, texto: string) => (problemas[correo] = [...(problemas[correo] ?? []), texto]);

  const existentes = new Set<string>();
  for (let i = 0; i < filas.length; i += 100) {
    const lote = filas.slice(i, i + 100);
    const { data } = await admin.from("profiles").select("email, rol").in("email", lote.map((f) => f.correo));
    for (const p of data ?? []) {
      if (!p.email) continue;
      if (p.rol === "archivado") anota(String(p.email).toLowerCase(), "Está archivada: recupérala primero");
      else existentes.add(String(p.email).toLowerCase());
    }
    const dnis = lote.filter((f) => !existentes.has(f.correo)).map((f) => normalizarDni(f.dni)).filter(Boolean);
    if (dnis.length > 0) {
      const { data: repetidos } = await admin.from("profiles").select("dni").in("dni", dnis);
      const usados = new Set((repetidos ?? []).map((r) => String(r.dni)));
      for (const f of lote) if (f.dni && !existentes.has(f.correo) && usados.has(normalizarDni(f.dni))) anota(f.correo, "Ese DNI ya lo tiene otra persona");
    }
  }
  const dnisArchivo = new Map<string, string>();
  for (const f of filas) {
    const d = normalizarDni(f.dni);
    if (d && dnisArchivo.has(d)) anota(f.correo, `DNI repetido en el archivo (también en ${dnisArchivo.get(d)})`);
    else if (d) dnisArchivo.set(d, f.correo);
    const r = preparar(f, cat);
    if ("error" in r) anota(f.correo, r.error);
  }
  return { problemas, existentes: [...existentes] };
}

// Completa a alguien que ya tiene cuenta: solo rellena lo que le falta, sin cambiar lo que ya tiene y sin mandarle otra invitación.
async function completarExistente(admin: ReturnType<typeof createAdminClient>, adminId: string, id: string, f: FilaImport, plan: PlanTarifa | null, correo: string): Promise<ResultadoFila> {
  const { data: p } = await admin.from("profiles").select("rol, nombre, apellidos, telefono, dni, fecha_nacimiento, contacto_emergencia_nombre, contacto_emergencia_telefono").eq("id", id).maybeSingle();
  if (!p) return { correo, ok: false, mensaje: "No se ha encontrado su cuenta." };
  if (p.rol === "archivado") return { correo, ok: false, mensaje: "Está archivada: recupérala primero." };

  const vacio = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
  const cambios: Record<string, string> = {};
  const nuevos: string[] = [];
  const pon = (campo: string, valor: string | null | undefined, etiqueta: string) => {
    if (valor && vacio((p as Record<string, unknown>)[campo])) {
      cambios[campo] = valor;
      nuevos.push(etiqueta);
    }
  };
  pon("nombre", f.nombre?.trim().slice(0, 80), "nombre");
  pon("apellidos", f.apellidos?.trim().slice(0, 120), "apellidos");
  pon("telefono", f.telefono?.trim().slice(0, 30), "teléfono");
  pon("dni", normalizarDni(f.dni ?? ""), "DNI");
  pon("fecha_nacimiento", f.nacimiento, "fecha de nacimiento");
  pon("contacto_emergencia_nombre", f.emergenciaNombre?.trim().slice(0, 120), "contacto de emergencia");
  pon("contacto_emergencia_telefono", f.emergenciaTelefono?.trim().slice(0, 30), "teléfono de emergencia");

  const avisos: string[] = [];
  if (Object.keys(cambios).length > 0) {
    const { error } = await admin.from("profiles").update(cambios).eq("id", id);
    if (error) {
      // Lo más probable es un DNI que ya tiene otra persona: se reintenta sin él.
      delete cambios.dni;
      if (Object.keys(cambios).length > 0) await admin.from("profiles").update(cambios).eq("id", id);
      avisos.push("El DNI no se pudo guardar (puede que ya lo tenga otra persona).");
    }
  }

  // Servicios que le faltan.
  const { data: tiene } = await admin.from("perfil_servicios").select("servicio").eq("user_id", id);
  const actuales = new Set((tiene ?? []).map((s) => String(s.servicio)));
  const queremos = [...new Set([...(f.servicios ?? []), ...(plan ? [plan.servicio] : [])].filter((s) => SERVICIOS.includes(s)))];
  const faltan = queremos.filter((s) => !actuales.has(s));
  if (faltan.length > 0 && p.rol !== "invitado") {
    await admin.from("perfil_servicios").insert(faltan.map((servicio) => ({ user_id: id, servicio })));
    nuevos.push(`servicio ${faltan.join(" + ")}`);
  }

  // Tarifa: solo si no tiene ya esa misma en marcha o en espera.
  if (plan && p.rol !== "invitado") {
    const { data: bonos } = await admin.from("bonos").select("id").eq("user_id", id).eq("tipo_bono_id", plan.tipoId).in("estado", ["activo", "en_cola"]).limit(1);
    if ((bonos ?? []).length > 0) avisos.push("Ya tiene esa tarifa: no se ha duplicado.");
    else {
      const r = await aplicarTarifa(admin, id, adminId, plan);
      if (r.ok) nuevos.push(plan.pagado ? "tarifa (cobrada)" : "tarifa (pago pendiente)");
      else avisos.push("No se pudo registrar la tarifa: añádela desde su ficha.");
    }
  }

  const base = nuevos.length > 0 ? `Ya tenía cuenta: se ha completado (${nuevos.join(", ")}).` : "Ya tenía cuenta: no le faltaba nada de lo que trae el archivo.";
  return { correo, ok: true, mensaje: `${base}${avisos.length > 0 ? " " + avisos.join(" ") : ""}` };
}

// Crea las cuentas de un grupo pequeño de personas y les manda su invitación (si se pide). Se llama por tandas desde la pantalla.
export async function importarLote(filas: FilaImport[], enviar: boolean): Promise<ResultadoFila[]> {
  const { user } = await requireAdmin("importar");
  const admin = createAdminClient();
  const cat = await cargarCatalogos();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const resultados: ResultadoFila[] = [];
  for (const f of filas.slice(0, 10)) {
    const correo = String(f.correo ?? "").trim().toLowerCase();
    if (!CORREO_VALIDO.test(correo)) {
      resultados.push({ correo, ok: false, mensaje: "El correo no es válido." });
      continue;
    }
    const tipo = f.tipo === "invitado" ? "invitado" : "alumno";

    const preparada = preparar({ ...f, tipo }, cat);
    if ("error" in preparada) {
      resultados.push({ correo, ok: false, mensaje: preparada.error });
      continue;
    }
    const plan = preparada.plan;
    const { data: existente } = await admin.from("profiles").select("id").eq("email", correo).maybeSingle();
    if (existente) {
      resultados.push(await completarExistente(admin, user.id, existente.id as string, { ...f, tipo }, plan, correo));
      continue;
    }
    const servicios = tipo === "alumno" ? [...new Set([...(f.servicios ?? []), ...(plan ? [plan.servicio] : [])].filter((s) => SERVICIOS.includes(s)))] : [];

    const { data, error } = await invitar(correo);
    if (error || !data.user) {
      resultados.push({ correo, ok: false, mensaje: "No se ha podido crear la cuenta." });
      continue;
    }
    const id = data.user.id;
    const avisos: string[] = [];
    const base = { rol: tipo, fue_alumno: tipo === "alumno", nombre: f.nombre?.trim().slice(0, 80) || null, apellidos: f.apellidos?.trim().slice(0, 120) || null, telefono: f.telefono?.trim().slice(0, 30) || null };
    const extra = {
      dni: normalizarDni(f.dni ?? "") || null,
      fecha_nacimiento: f.nacimiento || null,
      contacto_emergencia_nombre: f.emergenciaNombre?.trim().slice(0, 120) || null,
      contacto_emergencia_telefono: f.emergenciaTelefono?.trim().slice(0, 30) || null,
    };
    const { error: falloExtra } = await admin.from("profiles").update({ ...base, ...extra }).eq("id", id);
    if (falloExtra) {
      // Lo más probable es un DNI mal escrito: se guarda lo demás y se avisa.
      await admin.from("profiles").update(base).eq("id", id);
      avisos.push("No se pudieron guardar el DNI, la fecha de nacimiento o el contacto de emergencia: completa esos datos en su ficha.");
    }
    await admin.from("perfil_servicios").delete().eq("user_id", id);
    if (servicios.length > 0) await admin.from("perfil_servicios").insert(servicios.map((servicio) => ({ user_id: id, servicio })));
    if (plan) {
      const r = await aplicarTarifa(admin, id, user.id, plan);
      avisos.push(r.ok ? (plan.pagado ? "Tarifa registrada y cobrada." : "Tarifa registrada con el pago pendiente.") : "No se pudo registrar la tarifa: añádela desde su ficha.");
    }

    const ruta = `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`;
    const detalle = avisos.length > 0 ? ` ${avisos.join(" ")}` : "";
    if (enviar) {
      const ok = await enviarCorreo(correoInvitacion({ para: correo, alumno: tipo === "alumno", ruta }));
      const mensaje = ok ? "Cuenta creada e invitación enviada." : "Cuenta creada, pero no se pudo enviar el correo: manda el enlace por WhatsApp.";
      resultados.push({ correo, ok: true, mensaje: mensaje + detalle, enlace: ok ? undefined : `${protocolo}://${host}${ruta}` });
    } else {
      resultados.push({ correo, ok: true, mensaje: "Cuenta creada (sin invitación)." + detalle, enlace: `${protocolo}://${host}${ruta}` });
    }
  }

  revalidatePath("/admin/usuarios");
  return resultados;
}
