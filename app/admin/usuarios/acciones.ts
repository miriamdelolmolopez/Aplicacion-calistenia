"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { invitar } from "@/lib/registro";
import { enviarCorreo } from "@/lib/email";
import { correoInvitacion } from "@/lib/plantillas-email";
import { fijarInicioBono, inicioAltaValido } from "@/lib/altaBono";
import { claveDia, instanteMadrid, sumarDias } from "@/lib/fechas";
import { formaActiva, formasActivas } from "@/lib/formasPago";
import { CLAVES_SECCIONES } from "@/lib/seccionesAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";
import { headers } from "next/headers";
import type { Estado } from "../acciones";

// Notas privadas de Miriam sobre una persona (nadie más las ve).
export async function guardarNota(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const texto = String(formData.get("texto") ?? "").slice(0, 4000);

  const { error } = await createAdminClient()
    .from("notas_usuario")
    .upsert({ user_id: userId, texto, actualizado_en: new Date().toISOString() });
  if (error) return { error: "No se ha podido guardar la nota." };

  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: "Nota guardada." };
}

const SERVICIOS_VALIDOS = ["grupal", "individual", "online", "taller"];

// Fecha de inicio de un bono que la alumna ya tenía empezado (pasada o de hoy, y no de hace más de dos años).
function inicioValido(fecha: string): boolean {
  const d = instanteMadrid(fecha, "00:00");
  if (!d) return false;
  const ahora = Date.now();
  return d.getTime() <= ahora && d.getTime() >= ahora - 730 * 86_400_000;
}

// Cambia la fecha en que empezó un bono que ya existe.
export async function cambiarInicioBono(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("usuarios");
  const bonoId = String(formData.get("bonoId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const fecha = String(formData.get("inicio") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(bonoId) || !inicioValido(fecha)) return { error: "La fecha de inicio no es válida (no puede ser futura)." };
  await fijarInicioBono(createAdminClient(), bonoId, fecha);
  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: "Fecha de inicio cambiada. La caducidad se ha recalculado." };
}

// Registra una clase que la alumna YA hizo (fecha pasada): descuenta una clase de su bono y queda como «asistió».
export async function registrarClaseHecha(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(tipo)) return { error: "Elige el tipo de clase." };
  const empieza = instanteMadrid(fecha, hora);
  if (!empieza) return { error: "Escribe el día y la hora de la clase." };
  if (empieza.getTime() > Date.now()) return { error: "La clase tiene que ser de una fecha pasada. Para las próximas usa Reservar." };

  const { error } = await createAdminClient().rpc("registrar_clase_hecha", { p_user: userId, p_tipo: tipo, p_empieza: empieza.toISOString(), p_admin: user.id });
  if (error) return { error: error.message };

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/reservas");
  return { mensaje: "Clase registrada. Se ha descontado una clase de su bono y no se le ha avisado." };
}

const NOMBRE_SERVICIO: Record<string, string> = { grupal: "Clases grupales", individual: "Entrenamiento individual", online: "Entrenamiento online", taller: "Talleres" };

// Un servicio del alta tal como llega del formulario, y ya comprobado.
type FilaAlta = { servicio: string; tarifa: string; inicio: string; fin: string; pagado: boolean; fecha: string; hora: string; metodo: string; descuento: string };
type FilaPreparada = FilaAlta & { nombre: string; desde: Date | null; instantePago: Date; hastaFin: Date | null };

// Crea a una persona nueva desde «+» en Usuarios.
// Invitada: se le manda un correo con el enlace para crear su cuenta.
// Alumna: se crea su cuenta con sus servicios y, si se elige, su bono (con el pago hecho o pendiente);
// se le manda el correo para elegir contraseña y también se devuelve el enlace (por si prefieres WhatsApp).
export async function crearUsuario(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const tipo = String(formData.get("tipo") ?? "");
  const idioma = String(formData.get("idioma") ?? "es") === "en" ? "en" : "es";
  if (!emailValido(correo)) return { error: "El correo no es válido." };
  if (tipo !== "invitado" && tipo !== "alumno") return { error: "Elige si es invitado/a o alumno/a." };

  const admin = createAdminClient();
  const { data: existente } = await admin.from("profiles").select("id").ilike("email", correo).maybeSingle();
  if (existente) return { error: "Ese correo ya tiene cuenta. Búscalo en la lista." };

  if (tipo === "invitado") {
    const prueba = String(formData.get("prueba") ?? "normal");
    if (prueba === "normal") {
      const enviado = await enviarCorreo(correoInvitacion({ para: correo, alumno: false, ruta: "/registro", idioma }));
      return enviado
        ? { mensaje: `Invitación enviada a ${correo}. Cuando cree su cuenta aparecerá en la lista.` }
        : { error: "No se ha podido enviar el correo. Inténtalo de nuevo." };
    }

    // Prueba gratuita a medida: clases (presencial) o días de rutina (online), con sus fechas.
    if (!SERVICIOS_VALIDOS.includes(prueba)) return { error: "El tipo de prueba no es válido." };
    const clases = prueba === "online" ? 1 : Math.floor(Number(formData.get("pn")));
    if (!(clases >= 1 && clases <= 50)) return { error: "Escribe cuántas clases tiene la prueba (de 1 a 50)." };
    const dias = Math.floor(Number(formData.get("pd")));
    if (!(dias >= 1 && dias <= 365)) return { error: "Escribe cuántos días dura la prueba (de 1 a 365)." };
    const inicio = String(formData.get("pi") ?? "").trim();
    if (inicio && !inicioAltaValido(inicio)) return { error: "La fecha de inicio no es válida." };
    const fin = String(formData.get("pf") ?? "").trim();
    const hastaFin = fin ? instanteMadrid(fin, "23:59") : null;
    if (fin && !hastaFin) return { error: "La fecha de fin no es válida." };
    if (hastaFin && hastaFin.getTime() <= Date.now()) return { error: "La fecha de fin ya ha pasado: la prueba no se podría usar." };

    const { data: tipoPrueba } = await admin.from("tipos_bono").select("id").eq("nombre", `Prueba gratuita · ${prueba}`).maybeSingle();
    if (!tipoPrueba) return { error: "Todavía no están creadas las pruebas gratuitas en la base de datos: hay que ejecutar el archivo 062 en Supabase." };

    const { data: invitado, error: falloInvitar } = await invitar(correo);
    if (falloInvitar || !invitado.user) return { error: "No se ha podido crear la cuenta. Inténtalo de nuevo." };
    const userId = invitado.user.id;

    await admin.from("perfil_servicios").delete().eq("user_id", userId);
    await admin.from("perfil_servicios").insert({ user_id: userId, servicio: prueba });
    await admin.from("profiles").update({ idioma }).eq("id", userId);

    // La prueba es un bono gratuito (sin pago ni factura).
    const { data: bono, error: falloBono } = await admin
      .from("bonos")
      .insert({ user_id: userId, tipo_bono_id: tipoPrueba.id, servicio: prueba, clases_total: clases, clases_restantes: clases, validez_dias: dias, nota: "Prueba gratuita" })
      .select("id")
      .single();
    let avisoPrueba = "";
    if (falloBono || !bono) {
      avisoPrueba = " La cuenta está creada, pero la prueba no se pudo registrar: añádela desde su ficha.";
    } else {
      await admin.from("movimientos_bono").insert({ bono_id: bono.id, tipo: "alta", clases, nota: "Prueba gratuita", creado_por: user.id });
      await admin.rpc("refrescar_bonos", { p_user: userId });
      await fijarInicioBono(admin, bono.id as string, inicio || claveDia(new Date().toISOString()));
      if (hastaFin) await admin.from("bonos").update({ caduca_en: hastaFin.toISOString() }).eq("id", bono.id);
      avisoPrueba = prueba === "online" ? ` Prueba online de ${dias} ${dias === 1 ? "día" : "días"}.` : ` Prueba de ${clases} ${clases === 1 ? "clase" : "clases"}, para gastar en ${dias} ${dias === 1 ? "día" : "días"}.`;
    }

    const rutaPrueba = `/auth/confirmar?token_hash=${invitado.properties.hashed_token}&type=invite`;
    const enviadoPrueba = await enviarCorreo(correoInvitacion({ para: correo, alumno: false, ruta: rutaPrueba, idioma }));
    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    const hh = await headers();
    const hostPrueba = hh.get("host") ?? "localhost:3000";
    const protocoloPrueba = hh.get("x-forwarded-proto") ?? (hostPrueba.startsWith("localhost") ? "http" : "https");
    return {
      mensaje: `Invitado/a creado/a (${correo}).${avisoPrueba} ${enviadoPrueba ? "Le hemos enviado el correo para crear su contraseña. Si prefieres, también puedes mandarle este enlace por WhatsApp:" : "No se pudo enviar el correo: mándale este enlace por WhatsApp:"}`,
      enlace: `${protocoloPrueba}://${hostPrueba}${rutaPrueba}`,
    };
  }

  // Alumna: uno o varios servicios (o ninguno), cada uno con su tarifa, sus fechas y su pago independiente.
  const nFilas = Math.min(SERVICIOS_VALIDOS.length, Math.max(0, Number(formData.get("filas") ?? 0) || 0));
  const filas: FilaAlta[] = [];
  for (let i = 0; i < nFilas; i++) {
    const g = (k: string) => String(formData.get(`s${i}_${k}`) ?? "").trim();
    if (!g("servicio")) continue;
    filas.push({ servicio: g("servicio"), tarifa: g("tarifa"), inicio: g("inicio"), fin: g("fin"), pagado: formData.get(`s${i}_pagado`) === "on", fecha: g("fecha"), hora: g("hora"), metodo: g("metodo"), descuento: g("descuento") });
  }
  if (filas.some((f) => !SERVICIOS_VALIDOS.includes(f.servicio))) return { error: "Uno de los servicios no es válido." };
  if (new Set(filas.map((f) => f.servicio)).size !== filas.length) return { error: "Cada servicio solo puede aparecer una vez." };
  const metodoPorDefecto = (await formasActivas())[0]?.clave ?? "";

  // Se comprueba todo antes de crear la cuenta.
  const preparadas: FilaPreparada[] = [];
  for (const f of filas) {
    const nombre = NOMBRE_SERVICIO[f.servicio];
    if (!f.tarifa) {
      preparadas.push({ ...f, nombre, desde: null, instantePago: new Date(), hastaFin: null });
      continue;
    }
    const { data: t } = await admin.from("tipos_bono").select("servicio").eq("id", f.tarifa).eq("activo", true).maybeSingle();
    if (!t || t.servicio !== f.servicio) return { error: `La tarifa de ${nombre} no es válida.` };
    if (f.inicio && !inicioAltaValido(f.inicio)) return { error: `La fecha de inicio de ${nombre} no es válida.` };
    const desde = f.inicio ? instanteMadrid(f.inicio, "00:00") : new Date();

    let instantePago = new Date();
    if (f.pagado) {
      if (!(await formaActiva(f.metodo))) return { error: `Elige cómo paga ${nombre}.` };
      if (f.fecha) {
        const d = instanteMadrid(f.fecha, f.hora || "00:00");
        if (!d) return { error: `La fecha o la hora del pago de ${nombre} no son válidas.` };
        if (d.getTime() > Date.now() + 60_000) return { error: `La fecha y la hora del pago de ${nombre} no pueden ser futuras.` };
        instantePago = d;
      }
    }
    const hastaFin = f.fin ? instanteMadrid(f.fin, "23:59") : null;
    if (f.fin && !hastaFin) return { error: `La fecha de fin de ${nombre} no es válida.` };
    if (hastaFin && desde && hastaFin.getTime() <= desde.getTime()) return { error: `La fecha de fin de ${nombre} tiene que ser posterior a la de inicio.` };
    preparadas.push({ ...f, nombre, desde, instantePago, hastaFin });
  }

  const { data, error } = await invitar(correo);
  if (error || !data.user) return { error: "No se ha podido crear la cuenta. Inténtalo de nuevo." };

  const { error: falloRol } = await admin.from("profiles").update({ rol: "alumno", fue_alumno: true, idioma }).eq("id", data.user.id);
  if (falloRol) return { error: "La cuenta se creó, pero no se pudo asignar el tipo." };

  await admin.from("perfil_servicios").delete().eq("user_id", data.user.id);
  if (filas.length > 0) await admin.from("perfil_servicios").insert(filas.map((f) => ({ user_id: data.user!.id, servicio: f.servicio })));

  const avisos: string[] = [];
  for (const f of preparadas) {
    if (!f.tarifa) {
      avisos.push(`${f.nombre}: sin tarifa por ahora.`);
      continue;
    }
    const { data: bonoNuevo, error: falloBono } = await admin.rpc("crear_bono", {
      p_user: data.user.id,
      p_tipo: f.tarifa,
      p_metodo: f.pagado ? f.metodo : metodoPorDefecto,
      p_pagado: f.pagado,
      p_nota: "",
      p_admin: user.id,
      p_descuento: f.descuento || null,
    });
    if (falloBono || !bonoNuevo) {
      avisos.push(`${f.nombre}: no se pudo registrar la tarifa, hazlo en Bonos y pagos.`);
      continue;
    }
    if (f.inicio) await fijarInicioBono(admin, bonoNuevo as string, f.inicio, f.hastaFin);
    // La base de datos pone la fecha de ahora: se corrige con la elegida y se anota el mes al que corresponde.
    const periodo = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).format(f.instantePago).slice(0, 7);
    await admin
      .from("pagos")
      .update(f.pagado ? { pagado_en: f.instantePago.toISOString(), periodo } : { periodo })
      .eq("bono_id", bonoNuevo as string);
    // Fecha de fin elegida (para alargar o acortar): se aplica a lo que ya está en marcha.
    if (f.hastaFin) {
      await admin
        .from("bonos")
        .update({ caduca_en: f.hastaFin.toISOString() })
        .eq("user_id", data.user.id)
        .eq("tipo_bono_id", f.tarifa)
        .eq("estado", "activo")
        .gte("creado_en", new Date(Date.now() - 60_000).toISOString());
    }
    avisos.push(f.pagado ? `${f.nombre}: tarifa registrada y cobrada.` : `${f.nombre}: tarifa registrada, ya puede reservar y el pago queda pendiente de cobrar.`);
  }
  const avisoBono = avisos.length > 0 ? ` ${avisos.join(" ")}` : "";

  const ruta = `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=invite`;
  const enviado = await enviarCorreo(correoInvitacion({ para: correo, alumno: true, ruta, idioma }));

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    mensaje: `Alumno/a creada (${correo}).${avisoBono} ${enviado ? "Le hemos enviado el correo para elegir su contraseña. Si prefieres, también puedes mandarle este enlace por WhatsApp:" : "No se pudo enviar el correo: mándale este enlace por WhatsApp:"}`,
    enlace: `${protocolo}://${host}${ruta}`,
  };
}

// Los accesos de una persona. Cada opción se activa o desactiva por separado, con estas reglas:
//  · alumno/a, exalumno/a e invitado/a se excluyen entre sí; · una administradora puede ser también alumna y coach; · un invitado/a no puede ser administradora.
// Si es administradora, además, las secciones del panel que tiene excluidas.
export async function guardarAccesos(
  userId: string,
  datos: { alumno: boolean; exalumno: boolean; coach: boolean; invitado: boolean; admin: boolean; excluidos: string[] },
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "Persona no válida." };
  if (datos.invitado && (datos.alumno || datos.exalumno || datos.admin)) return { ok: false, error: "Un/a invitado/a no puede ser a la vez alumno/a, exalumno/a ni administradora." };
  if (datos.alumno && datos.exalumno) return { ok: false, error: "Si es alumno/a ahora, no puede ser exalumno/a." };
  if (!datos.alumno && !datos.exalumno && !datos.invitado && !datos.admin && !datos.coach) return { ok: false, error: "Marca al menos una opción." };

  const admin = createAdminClient();
  const { data: persona } = await admin.from("profiles").select("rol, fue_alumno").eq("id", userId).maybeSingle();
  if (!persona) return { ok: false, error: "No se ha encontrado a esa persona." };
  if (persona.rol === "archivado") return { ok: false, error: "Está archivada: primero hay que recuperarla." };

  // El tipo de cuenta de base: administradora, alumno/a, invitado/a, exalumno/a o, si solo es coach, «coach».
  const rol = datos.admin ? "admin" : datos.alumno ? "alumno" : datos.invitado ? "invitado" : datos.exalumno ? "exalumno" : "coach";

  // Para no quedarte sin acceso por error: tu propia cuenta no puede dejar de ser administradora,
  // y tiene que quedar siempre al menos una administradora.
  if (persona.rol === "admin" && rol !== "admin") {
    if (userId === user.id) return { ok: false, error: "No puedes quitarte a ti misma el acceso de administradora." };
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("rol", "admin");
    if ((count ?? 0) <= 1) return { ok: false, error: "Tiene que quedar al menos una administradora." };
  }

  const excluidos = rol === "admin" ? [...new Set(datos.excluidos.filter((c) => CLAVES_SECCIONES.includes(c)))] : [];
  if (userId === user.id && excluidos.length > 0) return { ok: false, error: "No puedes excluirte a ti misma secciones: te quedarías sin acceso a ellas." };

  const { error } = await admin
    .from("profiles")
    .update({
      rol,
      es_coach: !!datos.coach,
      tambien_alumno: rol === "admin" && datos.alumno,
      fue_alumno: !!persona.fue_alumno || datos.alumno || datos.exalumno,
      excluidos_admin: excluidos,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: "No se ha podido guardar. ¿Está ejecutado el archivo 067 en Supabase?" };

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true };
}

// Archiva a una persona: desaparece de las listas y no puede entrar, pero sus datos y pagos se conservan (y salen en Descargar datos).
export async function archivarUsuario(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "Persona no válida." };
  if (userId === user.id) return { ok: false, error: "No puedes archivar tu propia cuenta." };

  const admin = createAdminClient();
  const { data: persona } = await admin.from("profiles").select("rol").eq("id", userId).maybeSingle();
  if (!persona) return { ok: false, error: "No se ha encontrado a esa persona." };
  if (persona.rol === "admin") return { ok: false, error: "No se puede archivar a una administradora." };
  if (persona.rol === "archivado") return { ok: true };

  // Sus reservas de clases que todavía no han empezado se quitan (sin devolver la clase) y sale de las listas de espera.
  const { data: futuras } = await admin
    .from("reservas")
    .select("id, sesiones_clase!inner(empieza_en)")
    .eq("user_id", userId)
    .eq("estado", "reservada")
    .gt("sesiones_clase.empieza_en", new Date().toISOString());
  for (const r of (futuras ?? []) as { id: string }[]) {
    await admin.rpc("cancelar_reserva", { p_user: userId, p_reserva: r.id, p_admin: user.id, p_devolver: false });
  }
  await admin.from("lista_espera").delete().eq("user_id", userId);

  const { error } = await admin.from("profiles").update({ rol: "archivado", rol_anterior: persona.rol, archivado_en: new Date().toISOString() }).eq("id", userId);
  if (error) return { ok: false, error: "No se ha podido archivar. ¿Está ejecutado el archivo 065 en Supabase?" };
  // Sin acceso: no puede iniciar sesión mientras esté archivada.
  await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true };
}

// Recupera a una persona archivada: vuelve a su tipo de antes y puede volver a entrar.
export async function desarchivarUsuario(userId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "Persona no válida." };

  const admin = createAdminClient();
  const { data: persona } = await admin.from("profiles").select("rol, rol_anterior").eq("id", userId).maybeSingle();
  if (!persona || persona.rol !== "archivado") return { ok: false, error: "Esa persona no está archivada." };

  const { error } = await admin.from("profiles").update({ rol: persona.rol_anterior === "alumno" ? "alumno" : "invitado", rol_anterior: null, archivado_en: null }).eq("id", userId);
  if (error) return { ok: false, error: "No se ha podido recuperar." };
  await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true };
}

// Borrado definitivo: solo para cuando la persona lo pide por ley (derecho de supresión) y siempre después de archivarla.
// Se borran su cuenta y sus datos; los pagos se conservan (la base de datos les guarda su nombre y DNI).
export async function eliminarUsuario(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireAdmin("usuarios");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: "Persona no válida." };
  if (userId === user.id) return { ok: false, error: "No puedes eliminar tu propia cuenta." };

  const admin = createAdminClient();
  const { data: persona } = await admin.from("profiles").select("rol, foto_path").eq("id", userId).maybeSingle();
  if (!persona) return { ok: false, error: "No se ha encontrado a esa persona." };
  if (persona.rol === "admin") return { ok: false, error: "No se puede eliminar a una administradora." };
  if (persona.rol !== "archivado") return { ok: false, error: "Primero hay que archivar a la persona. El borrado definitivo es solo para peticiones legales." };

  if (persona.foto_path) await admin.storage.from("avatares").remove([persona.foto_path as string]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "No se ha podido eliminar. Inténtalo de nuevo." };

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/personas");
  return { ok: true };
}

// ---- Cambiar tarifa y fechas / quitar tarifa -------------------------------------------------
const UUID = /^[0-9a-f-]{36}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function refrescarPantallas(userId: string) {
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/bonos");
  revalidatePath("/admin/reservas");
}

// Cambia la tarifa y/o las fechas de un bono. Las clases ya usadas se respetan.
export async function cambiarTarifaYFechas(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const bonoId = String(formData.get("bonoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const modo = String(formData.get("modo") ?? "ninguna"); // ninguna | inicio | fin | ambas
  const inicio = String(formData.get("inicio") ?? "").trim();
  const fin = String(formData.get("fin") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!UUID.test(userId) || !UUID.test(bonoId)) return { error: "No se ha podido identificar el bono." };
  if (tipo && !UUID.test(tipo)) return { error: "La tarifa no es válida." };

  const admin = createAdminClient();
  const { data: bono } = await admin.from("bonos").select("id, user_id, tipo_bono_id, validez_dias").eq("id", bonoId).maybeSingle();
  if (!bono || bono.user_id !== userId) return { error: "No se ha encontrado ese bono." };

  let validez = bono.validez_dias as number;
  if (tipo && tipo !== bono.tipo_bono_id) {
    const { data: t } = await admin.from("tipos_bono").select("validez_dias").eq("id", tipo).maybeSingle();
    if (!t) return { error: "No se ha encontrado esa tarifa." };
    validez = t.validez_dias as number;
  }

  let desde: Date | null = null;
  let hasta: Date | null = null;
  if (modo === "inicio" || modo === "ambas") {
    if (!FECHA.test(inicio)) return { error: "Elige la fecha de inicio." };
    desde = instanteMadrid(inicio, "00:00");
  }
  if (modo === "fin" || modo === "ambas") {
    if (!FECHA.test(fin)) return { error: "Elige la fecha de fin." };
    hasta = instanteMadrid(fin, "00:00");
  }
  if (modo === "inicio" && desde) hasta = instanteMadrid(sumarDias(inicio, validez), "00:00");
  if (modo === "fin" && hasta) desde = instanteMadrid(sumarDias(fin, -validez), "00:00");
  if (modo !== "ninguna" && (!desde || !hasta)) return { error: "Las fechas no son válidas." };
  if (desde && hasta && hasta.getTime() <= desde.getTime()) return { error: "La fecha de fin tiene que ser posterior a la de inicio." };

  const { error } = await admin.rpc("cambiar_bono", {
    p_bono: bonoId,
    p_tipo: tipo || null,
    p_desde: desde ? desde.toISOString() : null,
    p_hasta: hasta ? hasta.toISOString() : null,
    p_nota: nota,
    p_admin: user.id,
  });
  if (error) return { error: error.message };

  // En una tarifa combinada (dos bonos de la misma compra), las fechas se cambian también en el otro.
  if (modo !== "ninguna" && (!tipo || tipo === bono.tipo_bono_id)) {
    const { data: base } = await admin.from("bonos").select("creado_en").eq("id", bonoId).maybeSingle();
    const { data: hermanos } = base
      ? await admin.from("bonos").select("id").eq("user_id", userId).eq("tipo_bono_id", bono.tipo_bono_id).eq("creado_en", base.creado_en).neq("id", bonoId)
      : { data: [] };
    for (const h of hermanos ?? []) {
      await admin.rpc("cambiar_bono", { p_bono: h.id, p_tipo: null, p_desde: desde ? desde.toISOString() : null, p_hasta: hasta ? hasta.toISOString() : null, p_nota: nota, p_admin: user.id });
    }
  }

  refrescarPantallas(userId);
  return { mensaje: "Cambios guardados." };
}

// Quita una tarifa: el bono, lo que se hace con su pago y con sus clases reservadas, y si se quita el servicio.
export async function quitarTarifa(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const bonoId = String(formData.get("bonoId") ?? "");
  const modo = String(formData.get("modo") ?? "ya"); // ya | al_caducar
  const pago = String(formData.get("pago") ?? "dejar"); // dejar | anular
  const reservas = String(formData.get("reservas") ?? "cancelar"); // cancelar | dejar
  const servicio = String(formData.get("servicio") ?? "dejar"); // dejar | quitar
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200);
  if (!UUID.test(userId) || !UUID.test(bonoId)) return { error: "No se ha podido identificar el bono." };

  const admin = createAdminClient();
  const { data: bono } = await admin.from("bonos").select("id, user_id, servicio, estado").eq("id", bonoId).maybeSingle();
  if (!bono || bono.user_id !== userId) return { error: "No se ha encontrado ese bono." };

  const ya = modo !== "al_caducar";
  const { error } = await admin.rpc("quitar_tarifa", {
    p_bono: bonoId,
    p_ya: ya,
    p_anular_pago: ya && pago === "anular",
    p_nota: nota,
    p_admin: user.id,
  });
  if (error) return { error: error.message };

  // Sus clases reservadas desde hoy con este bono (sin devolver la clase).
  let canceladas = 0;
  if (ya && reservas === "cancelar") {
    const { data: futuras } = await admin
      .from("reservas")
      .select("id, sesiones_clase!inner(empieza_en)")
      .eq("user_id", userId)
      .eq("bono_id", bonoId)
      .eq("estado", "reservada")
      .gt("sesiones_clase.empieza_en", new Date().toISOString());
    for (const r of (futuras ?? []) as { id: string }[]) {
      const { error: fallo } = await admin.rpc("cancelar_reserva", { p_user: userId, p_reserva: r.id, p_admin: user.id, p_devolver: false });
      if (!fallo) canceladas++;
    }
  }

  // Quitar el servicio solo si ya no le queda ningún bono de ese servicio.
  let servicioQuitado = false;
  if (servicio === "quitar") {
    const { count } = await admin
      .from("bonos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("servicio", bono.servicio)
      .in("estado", ["activo", "en_cola"]);
    if ((count ?? 0) === 0) {
      await admin.from("perfil_servicios").delete().eq("user_id", userId).eq("servicio", bono.servicio);
      servicioQuitado = true;
    }
  }

  refrescarPantallas(userId);
  const partes = [ya ? "Tarifa quitada." : "No se renovará: seguirá hasta que caduque."];
  if (canceladas > 0) partes.push(`Se han cancelado ${canceladas} ${canceladas === 1 ? "clase reservada" : "clases reservadas"}.`);
  if (servicio === "quitar") partes.push(servicioQuitado ? "Se le ha quitado el servicio." : "El servicio se mantiene porque aún tiene otra tarifa de ese tipo.");
  return { mensaje: partes.join(" ") };
}

// «No enviarle correos»: la app deja de mandarle cualquier correo a esa persona.
export async function cambiarSinCorreos(userId: string, valor: boolean): Promise<Estado> {
  await requireAdmin("usuarios");
  if (!UUID.test(userId)) return { error: "No se ha podido identificar a la persona." };
  const { error } = await createAdminClient().from("profiles").update({ sin_correos: valor }).eq("id", userId);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: valor ? "A partir de ahora no se le envía ningún correo." : "Vuelve a recibir los correos." };
}

// Un aviso por correo de una persona (confirmaciones, recordatorios, tarifa, mensajes, cumpleaños).
const AVISOS = ["avisos_reserva", "avisos_recordatorio", "avisos_bono", "avisos_novedades", "avisar_cumple", "avisos_cancelacion", "avisos_bono_clases", "avisos_inactividad", "avisos_cumpleanos"];
export async function cambiarAvisoPersona(userId: string, clave: string, valor: boolean): Promise<Estado> {
  await requireAdmin("usuarios");
  if (!UUID.test(userId) || !AVISOS.includes(clave)) return { error: "No se ha podido identificar a la persona." };
  const { error } = await createAdminClient().from("profiles").update({ [clave]: valor }).eq("id", userId);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath(`/admin/usuarios/${userId}`);
  return { mensaje: "Guardado." };
}

// Alargar cortesía: se elige hasta qué día y se calculan los días. También reabre una tarifa que acaba de caducar.
export async function alargarCortesia(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("usuarios");
  const userId = String(formData.get("userId") ?? "");
  const bonoId = String(formData.get("bonoId") ?? "");
  const hasta = String(formData.get("hasta") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200) || "Cortesía";
  if (!UUID.test(userId) || !UUID.test(bonoId)) return { error: "No se ha podido identificar el bono." };
  const objetivo = instanteMadrid(hasta, "23:59");
  if (!objetivo) return { error: "Elige hasta qué día quieres alargarla." };

  const admin = createAdminClient();
  const { data: bono } = await admin.from("bonos").select("id, user_id, caduca_en, estado").eq("id", bonoId).maybeSingle();
  if (!bono || bono.user_id !== userId) return { error: "No se ha encontrado ese bono." };
  if (!bono.caduca_en) return { error: "Este bono todavía no tiene fecha de caducidad." };

  const dias = Math.floor((objetivo.getTime() - new Date(bono.caduca_en as string).getTime()) / 86_400_000);
  if (dias < 1) return { error: "Elige un día posterior a la fecha de caducidad actual." };
  if (dias > 365) return { error: "No se puede alargar más de un año." };

  const { error } = await admin.rpc("ajustar_bono", { p_bono: bonoId, p_clases: 0, p_dias: dias, p_nota: nota, p_admin: user.id });
  if (error) return { error: error.message };

  refrescarPantallas(userId);
  return { mensaje: `Alargada ${dias} ${dias === 1 ? "día" : "días"}.` };
}
