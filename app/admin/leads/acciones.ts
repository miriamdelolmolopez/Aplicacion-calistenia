"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireLeads } from "./acceso";
import { enviarCorreo } from "@/lib/email";
import { correoInvitacion } from "@/lib/plantillas-email";
import { invitar } from "@/lib/registro";
import { formaActiva, formasActivas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";
import type { Estado } from "../acciones";
import { estadosDe } from "./datos";
import { colorValido, type InfoLead } from "./tipos";

const UUID = /^[0-9a-f-]{36}$/i;

function infoDe(texto: string): InfoLead[] {
  try {
    const lista = JSON.parse(texto) as unknown;
    if (!Array.isArray(lista)) return [];
    return lista
      .map((x) => ({ clave: String((x as InfoLead).clave ?? "").trim().slice(0, 80), valor: String((x as InfoLead).valor ?? "").trim().slice(0, 500) }))
      .filter((x) => x.clave || x.valor)
      .slice(0, 40);
  } catch {
    return [];
  }
}

// Comprueba los datos que se escriben a mano en un lead (nombre, email, etc.) y devuelve el error o los datos limpios.
// El tipo y las etiquetas se eligen de las listas del entrenador: se comprueba que sean suyas.
async function leerCampos(formData: FormData, entrenadorId: string) {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const nombre = g("nombre");
  const email = g("email").toLowerCase();
  if (!nombre) return { error: "Escribe el nombre." } as const;
  if (nombre.length > 80) return { error: "El nombre es demasiado largo." } as const;
  if (!emailValido(email)) return { error: "El correo no es válido." } as const;

  const admin = createAdminClient();
  const tipoId = g("tipo");
  if (tipoId) {
    const { data } = UUID.test(tipoId) ? await admin.from("leads_tipos").select("id").eq("id", tipoId).eq("entrenador_id", entrenadorId).maybeSingle() : { data: null };
    if (!data) return { error: "El tipo de lead no es válido." } as const;
  }
  const pedidas = [...new Set(formData.getAll("etiqueta").map((x) => String(x)).filter((x) => UUID.test(x)))].slice(0, 40);
  let etiquetaIds: string[] = [];
  if (pedidas.length > 0) {
    const { data } = await admin.from("leads_etiquetas").select("id").eq("entrenador_id", entrenadorId).in("id", pedidas);
    etiquetaIds = ((data ?? []) as { id: string }[]).map((x) => x.id);
  }
  return {
    datos: {
      nombre,
      apellidos: g("apellidos").slice(0, 120),
      telefono: g("telefono").slice(0, 30),
      email,
      pais: g("pais").slice(0, 60),
      idioma: g("idioma") === "en" ? "en" : "es",
      tipo_id: tipoId || null,
      etiqueta_ids: etiquetaIds,
      notas: g("notas").slice(0, 4000),
    },
  } as const;
}

// Crea un lead a mano. Empieza en el primer estado de la lista.
export async function crearLead(_previo: Estado, formData: FormData): Promise<Estado> {
  const { duenoId } = await requireLeads();
  const campos = await leerCampos(formData, duenoId);
  if ("error" in campos) return { error: campos.error };
  const destino = String(formData.get("destino") ?? "").trim().slice(0, 120) || "Manual";
  const estados = await estadosDe(duenoId);
  if (estados.length === 0) return { error: "No hay estados. Añade al menos uno con el lápiz." };

  const { error } = await createAdminClient()
    .from("leads")
    .insert({ ...campos.datos, entrenador_id: duenoId, estado_id: estados[0].id, destino, manual: true });
  if (error) return { error: "No se ha podido crear el lead. Inténtalo de nuevo." };
  revalidatePath("/admin/leads");
  return { mensaje: `Lead creado (${campos.datos.nombre}).` };
}

// Guarda los datos de un lead. El destino y la información del formulario solo se cambian si el lead es manual.
export async function guardarLead(_previo: Estado, formData: FormData): Promise<Estado> {
  const { duenoId } = await requireLeads();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "No se ha encontrado el lead." };
  const campos = await leerCampos(formData, duenoId);
  if ("error" in campos) return { error: campos.error };

  const admin = createAdminClient();
  const { data: lead } = await admin.from("leads").select("manual").eq("id", id).eq("entrenador_id", duenoId).maybeSingle();
  if (!lead) return { error: "No se ha encontrado el lead." };

  const cambios: Record<string, unknown> = { ...campos.datos, actualizado_en: new Date().toISOString() };
  if (lead.manual) {
    cambios.destino = String(formData.get("destino") ?? "").trim().slice(0, 120) || "Manual";
    cambios.info = infoDe(String(formData.get("info") ?? "[]"));
  }
  const { error } = await admin.from("leads").update(cambios).eq("id", id).eq("entrenador_id", duenoId);
  if (error) return { error: "No se han podido guardar los cambios." };
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { mensaje: "Cambios guardados." };
}

// Cambia el estado de un lead y lo deja anotado en las notas de venta.
export async function cambiarEstadoLead(leadId: string, estadoId: string): Promise<{ ok: boolean; error?: string }> {
  const { user, duenoId } = await requireLeads();
  if (!UUID.test(leadId) || !UUID.test(estadoId)) return { ok: false, error: "Datos no válidos." };
  const admin = createAdminClient();
  const { data: estado } = await admin.from("leads_estados").select("nombre").eq("id", estadoId).eq("entrenador_id", duenoId).maybeSingle();
  if (!estado) return { ok: false, error: "Ese estado no existe." };
  const { error } = await admin
    .from("leads")
    .update({ estado_id: estadoId, actualizado_en: new Date().toISOString() })
    .eq("id", leadId)
    .eq("entrenador_id", duenoId);
  if (error) return { ok: false, error: "No se ha podido cambiar el estado." };
  await admin.from("leads_notas").insert({ lead_id: leadId, entrenador_id: duenoId, texto: `Estado: ${estado.nombre}`, estado_nombre: estado.nombre, autor: user.email ?? "" });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

// Añade una nota interna de venta (queda con quién, cuándo y en qué estado estaba el lead).
export async function anadirNotaVenta(leadId: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  const { user, duenoId } = await requireLeads();
  const limpio = texto.trim().slice(0, 2000);
  if (!UUID.test(leadId) || !limpio) return { ok: false, error: "Escribe la nota." };
  const admin = createAdminClient();
  const { data: lead } = await admin.from("leads").select("estado_id, leads_estados(nombre)").eq("id", leadId).eq("entrenador_id", duenoId).maybeSingle();
  if (!lead) return { ok: false, error: "No se ha encontrado el lead." };
  const estado = (lead.leads_estados as unknown as { nombre: string } | null)?.nombre ?? "";
  const { error } = await admin.from("leads_notas").insert({ lead_id: leadId, entrenador_id: duenoId, texto: limpio, estado_nombre: estado, autor: user.email ?? "" });
  if (error) return { ok: false, error: "No se ha podido guardar la nota." };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

// Guarda la lista de estados: nombres, orden y cuáles cuentan como «ganado». No deja quitar un estado que algún lead esté usando.
export async function guardarEstados(
  lista: { id?: string; nombre: string; es_ganado: boolean; color: string }[],
  quitados: string[],
): Promise<{ ok: boolean; error?: string }> {
  const { duenoId } = await requireLeads();
  const limpia = lista.map((e) => ({ id: e.id && UUID.test(e.id) ? e.id : undefined, nombre: String(e.nombre ?? "").trim().slice(0, 40), es_ganado: !!e.es_ganado, color: colorValido(String(e.color)) ? String(e.color) : "gris" }));
  if (limpia.length === 0) return { ok: false, error: "Tiene que quedar al menos un estado." };
  if (limpia.some((e) => !e.nombre)) return { ok: false, error: "Ningún estado puede quedar sin nombre." };
  const nombres = limpia.map((e) => e.nombre.toLowerCase());
  if (new Set(nombres).size !== nombres.length) return { ok: false, error: "Hay dos estados con el mismo nombre." };

  const admin = createAdminClient();
  const ids = quitados.filter((q) => UUID.test(q));
  if (ids.length > 0) {
    const { data: usados } = await admin.from("leads").select("estado_id").eq("entrenador_id", duenoId).in("estado_id", ids);
    if (usados && usados.length > 0) return { ok: false, error: "Hay leads con un estado que quieres quitar. Cámbialos de estado antes." };
    const { error: falloQuitar } = await admin.from("leads_estados").delete().eq("entrenador_id", duenoId).in("id", ids);
    if (falloQuitar) return { ok: false, error: "No se han podido quitar los estados." };
  }

  // Primero se les pone un nombre provisional a los que ya existían, para poder intercambiar nombres sin chocar.
  const existentes = limpia.filter((e) => e.id);
  for (const e of existentes) await admin.from("leads_estados").update({ nombre: `~${e.id}` }).eq("id", e.id!).eq("entrenador_id", duenoId);
  for (const [orden, e] of limpia.entries()) {
    if (e.id) {
      const { error } = await admin.from("leads_estados").update({ nombre: e.nombre, orden, es_ganado: e.es_ganado, color: e.color }).eq("id", e.id).eq("entrenador_id", duenoId);
      if (error) return { ok: false, error: "No se han podido guardar los estados." };
    } else {
      const { error } = await admin.from("leads_estados").insert({ entrenador_id: duenoId, nombre: e.nombre, orden, es_ganado: e.es_ganado, color: e.color });
      if (error) return { ok: false, error: "No se han podido guardar los estados." };
    }
  }
  revalidatePath("/admin/leads");
  return { ok: true };
}

const NOMBRE_SERVICIO: Record<string, string> = { online: "Entrenamiento online", grupal: "Clases grupales", individual: "Entrenamiento individual" };

export type Contrato = { servicio: string; tarifaId: string; pagado: boolean };

// Convierte un lead «ganado» en cliente: crea su cuenta de alumno/a con lo que ha contratado (servicio y tarifa, pagada o pendiente)
// y le manda el correo para elegir su contraseña. Se puede convertir sin contratos y asignarle la tarifa después desde su ficha.
export async function convertirEnCliente(leadId: string, contratos: Contrato[], metodo: string): Promise<Estado> {
  const { user, duenoId } = await requireLeads();
  if (!UUID.test(leadId)) return { error: "No se ha encontrado el lead." };
  const validos = ["online", "grupal", "individual"];
  if (contratos.some((c) => !validos.includes(c.servicio))) return { error: "Uno de los servicios no es válido." };
  if (new Set(contratos.map((c) => c.servicio)).size !== contratos.length) return { error: "Cada servicio solo puede aparecer una vez." };

  const admin = createAdminClient();
  const { data: lead } = await admin.from("leads").select("nombre, apellidos, email, idioma, cliente_id, leads_estados(es_ganado)").eq("id", leadId).eq("entrenador_id", duenoId).maybeSingle();
  if (!lead) return { error: "No se ha encontrado el lead." };
  if (lead.cliente_id) return { error: "Este lead ya es cliente." };
  if (!(lead.leads_estados as unknown as { es_ganado: boolean } | null)?.es_ganado) return { error: "Para convertirlo en cliente, primero ponlo en el estado «Ganado»." };
  const correo = String(lead.email).toLowerCase();
  if (!emailValido(correo)) return { error: "El lead no tiene un correo válido." };
  const idioma = lead.idioma === "en" ? "en" : "es";

  // Se comprueba todo antes de crear la cuenta.
  for (const c of contratos) {
    if (!c.tarifaId) continue;
    const { data: t } = await admin.from("tipos_bono").select("servicio").eq("id", c.tarifaId).eq("activo", true).maybeSingle();
    if (!t || t.servicio !== c.servicio) return { error: "Una de las tarifas no es válida para su servicio." };
  }
  const hayPagados = contratos.some((c) => c.tarifaId && c.pagado);
  if (hayPagados && !(await formaActiva(metodo))) return { error: "Elige cómo ha pagado." };
  const metodoPorDefecto = (await formasActivas())[0]?.clave ?? "";

  const { data: existente } = await admin.from("profiles").select("id").ilike("email", correo).maybeSingle();
  if (existente) return { error: "Ese correo ya tiene cuenta. Búscalo en Clientes." };

  const { data, error } = await invitar(correo);
  if (error || !data.user) return { error: "No se ha podido crear la cuenta. Inténtalo de nuevo." };
  const clienteId = data.user.id;
  const { error: falloPerfil } = await admin.from("profiles").update({ rol: "alumno", fue_alumno: true, idioma, nombre: lead.nombre, apellidos: lead.apellidos }).eq("id", clienteId);
  if (falloPerfil) return { error: "La cuenta se creó, pero no se pudo asignar el tipo. Mira Clientes." };
  await admin.from("perfil_servicios").delete().eq("user_id", clienteId);
  if (contratos.length > 0) await admin.from("perfil_servicios").insert(contratos.map((c) => ({ user_id: clienteId, servicio: c.servicio })));

  // Su tipo de lead según lo contratado: solo online, solo presencial (grupal o individual) o los dos (híbrido).
  const online = contratos.some((c) => c.servicio === "online");
  const presencial = contratos.some((c) => c.servicio !== "online");
  const tipo = online && presencial ? "hibrido" : online ? "online" : presencial ? "presencial" : null;

  const avisos: string[] = [];
  for (const c of contratos) {
    if (!c.tarifaId) {
      avisos.push(`${NOMBRE_SERVICIO[c.servicio]}: sin tarifa por ahora.`);
      continue;
    }
    const { data: bono, error: falloBono } = await admin.rpc("crear_bono", {
      p_user: clienteId,
      p_tipo: c.tarifaId,
      p_metodo: c.pagado ? metodo : metodoPorDefecto,
      p_pagado: c.pagado,
      p_nota: "",
      p_admin: user.id,
      p_descuento: null,
    });
    avisos.push(falloBono || !bono ? `${NOMBRE_SERVICIO[c.servicio]}: no se pudo registrar la tarifa, hazlo en su ficha.` : c.pagado ? `${NOMBRE_SERVICIO[c.servicio]}: tarifa registrada y cobrada.` : `${NOMBRE_SERVICIO[c.servicio]}: tarifa registrada, pago pendiente de cobrar.`);
  }
  const nombreTipo = tipo === "hibrido" ? "híbrido" : tipo;
  const { data: tiposDelEntrenador } = tipo ? await admin.from("leads_tipos").select("id, nombre").eq("entrenador_id", duenoId) : { data: [] };
  const tipoLista = ((tiposDelEntrenador ?? []) as { id: string; nombre: string }[]).find((t) => t.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === (nombreTipo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  await admin
    .from("leads")
    .update({ cliente_id: clienteId, ...(tipoLista ? { tipo_id: tipoLista.id } : {}), actualizado_en: new Date().toISOString() })
    .eq("id", leadId)
    .eq("entrenador_id", duenoId);

  const ruta = `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`;
  const enviado = await enviarCorreo(correoInvitacion({ para: correo, alumno: true, ruta, idioma }));
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/usuarios");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    mensaje: `${lead.nombre} ya es cliente (${correo}). ${avisos.join(" ")} ${enviado ? "Le hemos enviado el correo para elegir su contraseña." : "No se pudo enviar el correo: mándale este enlace por WhatsApp (no lo abras tú):"}`.replace(/\s+/g, " ").trim(),
    enlace: enviado ? undefined : `${protocolo}://${host}${ruta}`,
  };
}

// Elimina un lead para siempre (sus notas se van con él). Si ya se había convertido en cliente, la cuenta del cliente no se toca.
export async function eliminarLead(leadId: string): Promise<{ ok: boolean; error?: string }> {
  const { duenoId } = await requireLeads();
  if (!UUID.test(leadId)) return { ok: false, error: "No se ha encontrado el lead." };
  const { error } = await createAdminClient().from("leads").delete().eq("id", leadId).eq("entrenador_id", duenoId);
  if (error) return { ok: false, error: "No se ha podido eliminar el lead." };
  revalidatePath("/admin/leads");
  return { ok: true };
}

// ===== Acciones sobre varios leads a la vez (los que se marcan con las casillas) =====
const MAXIMO_VARIOS = 500;
const idsValidos = (ids: string[]) => [...new Set(ids.filter((x) => UUID.test(x)))].slice(0, MAXIMO_VARIOS);

// Cambia el estado de todos los leads marcados y lo deja anotado en las notas de cada uno.
export async function cambiarEstadoVarios(ids: string[], estadoId: string): Promise<{ ok: boolean; error?: string; cambiados?: number }> {
  const { user, duenoId } = await requireLeads();
  const lista = idsValidos(ids);
  if (lista.length === 0 || !UUID.test(estadoId)) return { ok: false, error: "No hay leads marcados." };
  const admin = createAdminClient();
  const { data: estado } = await admin.from("leads_estados").select("nombre").eq("id", estadoId).eq("entrenador_id", duenoId).maybeSingle();
  if (!estado) return { ok: false, error: "Ese estado no existe." };
  const { data: cambiados, error } = await admin
    .from("leads")
    .update({ estado_id: estadoId, actualizado_en: new Date().toISOString() })
    .in("id", lista)
    .eq("entrenador_id", duenoId)
    .select("id");
  if (error) return { ok: false, error: "No se ha podido cambiar el estado." };
  const hechos = (cambiados ?? []) as { id: string }[];
  if (hechos.length > 0) {
    await admin.from("leads_notas").insert(hechos.map((l) => ({ lead_id: l.id, entrenador_id: duenoId, texto: `Estado: ${estado.nombre}`, estado_nombre: estado.nombre, autor: user.email ?? "" })));
  }
  revalidatePath("/admin/leads");
  return { ok: true, cambiados: hechos.length };
}

// Pone (o quita, con null) el tipo de lead a todos los marcados.
export async function cambiarTipoVarios(ids: string[], tipoId: string | null): Promise<{ ok: boolean; error?: string; cambiados?: number }> {
  const { duenoId } = await requireLeads();
  const lista = idsValidos(ids);
  if (lista.length === 0) return { ok: false, error: "No hay leads marcados." };
  const admin = createAdminClient();
  if (tipoId !== null) {
    const { data } = UUID.test(tipoId) ? await admin.from("leads_tipos").select("id").eq("id", tipoId).eq("entrenador_id", duenoId).maybeSingle() : { data: null };
    if (!data) return { ok: false, error: "Ese tipo no existe." };
  }
  const { data, error } = await admin.from("leads").update({ tipo_id: tipoId, actualizado_en: new Date().toISOString() }).in("id", lista).eq("entrenador_id", duenoId).select("id");
  if (error) return { ok: false, error: "No se ha podido cambiar el tipo." };
  revalidatePath("/admin/leads");
  return { ok: true, cambiados: (data ?? []).length };
}

// Añade o quita una o varias etiquetas en todos los marcados (sin tocar las demás etiquetas que ya tengan).
export async function etiquetaVarios(ids: string[], etiquetaIds: string[], accion: "anadir" | "quitar"): Promise<{ ok: boolean; error?: string; cambiados?: number }> {
  const { duenoId } = await requireLeads();
  const lista = idsValidos(ids);
  const pedidas = [...new Set(etiquetaIds.filter((x) => UUID.test(x)))].slice(0, 40);
  if (lista.length === 0 || pedidas.length === 0 || (accion !== "anadir" && accion !== "quitar")) return { ok: false, error: "Elige los leads y las etiquetas." };
  const admin = createAdminClient();
  const { data: propias } = await admin.from("leads_etiquetas").select("id").eq("entrenador_id", duenoId).in("id", pedidas);
  const validas = ((propias ?? []) as { id: string }[]).map((e) => e.id);
  if (validas.length === 0) return { ok: false, error: "Esas etiquetas no existen." };
  const { data: leads } = await admin.from("leads").select("id, etiqueta_ids").in("id", lista).eq("entrenador_id", duenoId);
  let cambiados = 0;
  const filas = (leads ?? []) as { id: string; etiqueta_ids: string[] }[];
  for (let i = 0; i < filas.length; i += 25) {
    await Promise.all(
      filas.slice(i, i + 25).map(async (l) => {
        const nuevas = accion === "anadir" ? [...new Set([...l.etiqueta_ids, ...validas])] : l.etiqueta_ids.filter((x) => !validas.includes(x));
        if (nuevas.length === l.etiqueta_ids.length) return;
        const { error } = await admin.from("leads").update({ etiqueta_ids: nuevas, actualizado_en: new Date().toISOString() }).eq("id", l.id).eq("entrenador_id", duenoId);
        if (!error) cambiados += 1;
      }),
    );
  }
  revalidatePath("/admin/leads");
  return { ok: true, cambiados };
}

// Elimina a la vez todos los leads marcados (con sus notas). Las cuentas de clientes ya creadas no se tocan.
export async function eliminarLeads(ids: string[]): Promise<{ ok: boolean; error?: string; eliminados?: number }> {
  const { duenoId } = await requireLeads();
  const lista = idsValidos(ids);
  if (lista.length === 0) return { ok: false, error: "No hay leads marcados." };
  const { data, error } = await createAdminClient().from("leads").delete().in("id", lista).eq("entrenador_id", duenoId).select("id");
  if (error) return { ok: false, error: "No se han podido eliminar." };
  revalidatePath("/admin/leads");
  return { ok: true, eliminados: (data ?? []).length };
}
