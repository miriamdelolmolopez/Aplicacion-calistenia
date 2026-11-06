"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { ejecutarRegla, muestraCondiciones, probarRegla } from "@/lib/reglas";
import { OPERADORES, tipoDeCondicion, type Accion, type Condicion, type Regla } from "@/lib/reglasCatalogo";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTERO = /^-?\d{1,6}$/;

export type Resultado = { ok: boolean; error?: string; mensaje?: string; id?: string };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Una condición a medias (mientras se está editando) no cuenta; esta función dice si ya está completa y es válida.
function condicionValida(raw: unknown): Condicion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const t = tipoDeCondicion(texto(r.tipo, 40));
  if (!t) return null;
  const operador = texto(r.operador, 20);
  if (!OPERADORES[t.clase].some((o) => o.valor === operador)) return null;
  const valor = texto(r.valor, 80);
  const valor2 = texto(r.valor2, 80);
  if (t.clase === "numero") {
    if (operador === "vacio") return { tipo: t.clave, operador: "vacio", valor: "" };
    if (!ENTERO.test(valor)) return null;
    if (operador === "entre") return ENTERO.test(valor2) ? { tipo: t.clave, operador: "entre", valor, valor2 } : null;
    return { tipo: t.clave, operador: operador as Condicion["operador"], valor };
  }
  if (t.dinamico === "tarifas") return UUID.test(valor) ? { tipo: t.clave, operador: operador as Condicion["operador"], valor } : null;
  return t.opciones?.some((o) => o.valor === valor) ? { tipo: t.clave, operador: operador as Condicion["operador"], valor } : null;
}

function accionValida(raw: unknown): Accion | string {
  if (!raw || typeof raw !== "object") return "Hay una consecuencia vacía.";
  const r = raw as Record<string, unknown>;
  const enlace = texto(r.enlace, 60);
  const ruta = enlace && enlace.startsWith("/") && !enlace.startsWith("//") ? enlace : undefined;
  if (r.tipo === "app") {
    const titulo = texto(r.titulo, 120);
    const t = texto(r.texto, 300);
    if (titulo.length < 2 || t.length < 2) return "Escribe el título y el texto del aviso en la app.";
    return { tipo: "app", titulo, texto: t, enlace: ruta };
  }
  if (r.tipo === "correo") {
    const asunto = texto(r.asunto, 150);
    const mensaje = texto(r.mensaje, 3000);
    if (asunto.length < 2 || mensaje.length < 2) return "Escribe el asunto y el mensaje del correo.";
    const asuntoEn = texto(r.asunto_en, 150);
    const mensajeEn = texto(r.mensaje_en, 3000);
    return { tipo: "correo", asunto, mensaje, ...(asuntoEn && mensajeEn ? { asunto_en: asuntoEn, mensaje_en: mensajeEn } : {}), enlace: ruta };
  }
  if (r.tipo === "clases") {
    const cantidad = Number(r.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) return "Las clases que se añaden van de 1 a 20.";
    if (r.servicio !== "grupal" && r.servicio !== "individual") return "Elige si las clases son grupales o individuales.";
    return { tipo: "clases", cantidad, servicio: r.servicio, nota: texto(r.nota, 100) || undefined };
  }
  if (r.tipo === "tarea") {
    const t = texto(r.texto, 300);
    if (t.length < 2) return "Escribe el texto de la tarea (será el mensaje de WhatsApp).";
    return { tipo: "tarea", texto: t };
  }
  return "Hay una consecuencia que no es válida.";
}

function limpiarRegla(raw: unknown): { error: string } | { nombre: string; condiciones: Condicion[]; acciones: Accion[]; repeticion_dias: number | null } {
  if (!raw || typeof raw !== "object") return { error: "Faltan datos." };
  const r = raw as Record<string, unknown>;
  const nombre = texto(r.nombre, 80);
  if (nombre.length < 2) return { error: "Ponle un nombre a la automatización." };

  const condsRaw = Array.isArray(r.condiciones) ? r.condiciones : [];
  if (condsRaw.length === 0) return { error: "Añade al menos una condición en «Cuando ocurra»." };
  if (condsRaw.length > 10) return { error: "Son demasiadas condiciones (máximo 10)." };
  const condiciones: Condicion[] = [];
  for (const c of condsRaw) {
    const v = condicionValida(c);
    if (!v) return { error: "Hay una condición sin terminar: elige el tipo, el operador y el valor." };
    condiciones.push(v);
  }

  const accsRaw = Array.isArray(r.acciones) ? r.acciones : [];
  if (accsRaw.length === 0) return { error: "Añade al menos una consecuencia en «Entonces que haga»." };
  if (accsRaw.length > 6) return { error: "Son demasiadas consecuencias (máximo 6)." };
  const acciones: Accion[] = [];
  for (const a of accsRaw) {
    const v = accionValida(a);
    if (typeof v === "string") return { error: v };
    acciones.push(v);
  }

  let repeticion_dias: number | null = null;
  if (r.repeticion_dias !== null && r.repeticion_dias !== undefined && r.repeticion_dias !== "") {
    const n = Number(r.repeticion_dias);
    if (!Number.isInteger(n) || n < 1 || n > 365) return { error: "Los días para repetir van de 1 a 365." };
    repeticion_dias = n;
  }
  return { nombre, condiciones, acciones, repeticion_dias };
}

async function cargarRegla(id: string): Promise<Regla | null> {
  if (!UUID.test(id)) return null;
  const { data } = await createAdminClient().from("reglas_automaticas").select("*").eq("id", id).maybeSingle();
  return (data as Regla | null) ?? null;
}

function refrescar() {
  revalidatePath("/admin/automatizaciones");
}

export async function guardarRegla(id: string | null, raw: unknown, activa: boolean): Promise<Resultado> {
  await requireAdmin("automatizaciones");
  const limpia = limpiarRegla(raw);
  if ("error" in limpia) return { ok: false, error: limpia.error };
  const admin = createAdminClient();
  const datos = { ...limpia, activa, actualizado_en: new Date().toISOString() };
  if (id) {
    if (!UUID.test(id)) return { ok: false, error: "Automatización no válida." };
    const { error } = await admin.from("reglas_automaticas").update(datos).eq("id", id);
    if (error) return { ok: false, error: "No se ha podido guardar." };
    refrescar();
    return { ok: true, id, mensaje: "Guardado." };
  }
  const { data, error } = await admin.from("reglas_automaticas").insert(datos).select("id").single();
  if (error || !data) return { ok: false, error: "No se ha podido crear. ¿Se ha ejecutado el archivo 085 en Supabase?" };
  refrescar();
  return { ok: true, id: data.id as string, mensaje: "Creada." };
}

export async function alternarRegla(id: string, activa: boolean): Promise<Resultado> {
  await requireAdmin("automatizaciones");
  if (!UUID.test(id)) return { ok: false, error: "Automatización no válida." };
  const { error } = await createAdminClient().from("reglas_automaticas").update({ activa, actualizado_en: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "No se ha podido cambiar." };
  refrescar();
  return { ok: true };
}

export async function eliminarRegla(id: string): Promise<Resultado> {
  await requireAdmin("automatizaciones");
  if (!UUID.test(id)) return { ok: false, error: "Automatización no válida." };
  const { error } = await createAdminClient().from("reglas_automaticas").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido eliminar." };
  refrescar();
  return { ok: true };
}

// «Ahora mismo cumplen X personas» mientras se editan las condiciones. Las que aún no están completas no cuentan.
export async function muestraRegla(raw: unknown): Promise<{ total: number; nombres: string[]; completas: number }> {
  await requireAdmin("automatizaciones");
  const lista = (Array.isArray(raw) ? raw : []).slice(0, 10).map(condicionValida);
  const condiciones = lista.filter((c): c is Condicion => c !== null);
  if (condiciones.length === 0 || condiciones.length !== lista.length) return { total: 0, nombres: [], completas: condiciones.length };
  const m = await muestraCondiciones(condiciones);
  return { ...m, completas: condiciones.length };
}

export async function probarReglaAhora(id: string): Promise<Resultado> {
  const { user } = await requireAdmin("automatizaciones");
  const regla = await cargarRegla(id);
  if (!regla) return { ok: false, error: "No se ha encontrado la automatización (guárdala primero)." };
  const hecho = await probarRegla(regla, user.id);
  return { ok: true, mensaje: hecho.join(" ") };
}

export async function ejecutarReglaAhora(id: string): Promise<Resultado> {
  await requireAdmin("automatizaciones");
  const regla = await cargarRegla(id);
  if (!regla) return { ok: false, error: "No se ha encontrado la automatización (guárdala primero)." };
  const r = await ejecutarRegla(regla);
  refrescar();
  return {
    ok: true,
    mensaje: `Aplicada a ${r.aplicadas} ${r.aplicadas === 1 ? "persona" : "personas"}${r.omitidas ? ` (${r.omitidas} ya la habían recibido)` : ""}${r.tareas ? ` · ${r.tareas} ${r.tareas === 1 ? "tarea nueva" : "tareas nuevas"}` : ""}.`,
  };
}

export async function marcarTareaHecha(formData: FormData): Promise<void> {
  await requireAdmin("automatizaciones");
  const id = texto(formData.get("id"), 60);
  if (!UUID.test(id)) return;
  await createAdminClient().from("reglas_tareas").update({ estado: "hecha" }).eq("id", id);
  refrescar();
}
