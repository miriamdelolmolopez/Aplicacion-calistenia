"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { avisarClaseCancelada, avisarPlazaLiberada, avisarReserva, personasEnEspera } from "@/lib/avisos";
import { colorLibre, colorValido } from "@/lib/colores";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

function entero(valor: FormDataEntryValue | null): number {
  const texto = String(valor ?? "").trim();
  if (texto === "") return 0;
  const n = Number(texto);
  return Number.isInteger(n) ? n : NaN;
}

// Crea las clases de las próximas semanas a partir del horario semanal.
export async function generarClases(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const semanas = entero(formData.get("semanas"));
  if (!(semanas >= 1 && semanas <= 12)) return { error: "Elige entre 1 y 12 semanas." };

  const { data, error } = await createAdminClient().rpc("generar_clases", { semanas });
  if (error) return { error: "No se han podido crear las clases." };

  revalidatePath("/admin/clases");
  return {
    mensaje:
      data === 0
        ? "Ya estaban creadas todas las clases de esas semanas."
        : `Se han creado ${data} clases nuevas.`,
  };
}

export async function cambiarPlazas(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const plazas = entero(formData.get("plazas"));
  const prueba = entero(formData.get("plazas_prueba"));
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(prueba >= 0 && prueba <= plazas)) {
    return { error: "Las plazas de prueba no pueden ser más que las plazas de la clase." };
  }

  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ plazas, plazas_prueba: prueba })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Plazas guardadas." };
}

// Quita a alguien de la lista de espera de una clase.
export async function quitarDeLista(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const { error } = await createAdminClient()
    .from("lista_espera")
    .delete()
    .eq("id", String(formData.get("esperaId") ?? ""));
  if (error) return { error: "No se ha podido quitar." };

  revalidatePath("/admin/clases");
  return { mensaje: "Quitado de la lista de espera." };
}

// Cancela la clase, devuelve su clase a todos los apuntados y amplía su bono
// los días indicados (0 = sin ampliar).
export async function cancelarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 200);
  const dias = entero(formData.get("dias"));
  if (!(dias >= 0 && dias <= 60)) return { error: "Los días de ampliación van de 0 a 60." };

  const enEspera = await personasEnEspera(id); // la cancelación vacía la lista
  const { data, error } = await createAdminClient().rpc("cancelar_clase", {
    p_sesion: id,
    p_motivo: motivo,
    p_dias: dias,
    p_admin: user.id,
  });
  if (error) return { error: error.message };
  after(() => avisarClaseCancelada(id, dias, enEspera));

  revalidatePath("/admin/clases");
  const personas = Number(data ?? 0);
  return {
    mensaje:
      `Clase cancelada. Se ha devuelto la clase a ${personas} ${personas === 1 ? "persona" : "personas"}` +
      (dias > 0 && personas > 0 ? ` y se han ampliado sus bonos ${dias} días.` : "."),
  };
}

export async function reactivarClase(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("sesionId") ?? "");
  const { error } = await createAdminClient()
    .from("sesiones_clase")
    .update({ estado: "programada", motivo_cancelacion: null })
    .eq("id", id);
  if (error) return { error: "No se ha podido reactivar." };

  revalidatePath("/admin/clases");
  return {
    mensaje:
      "Clase reactivada. Las reservas anteriores no se recuperan: se les devolvió su clase.",
  };
}

// Apunta a un alumno a una clase (usa su bono; puede saltarse el límite de antelación).
export async function apuntarAlumno(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const persona = String(formData.get("persona") ?? "");
  if (!persona) return { error: "Elige una persona." };

  const sesionId = String(formData.get("sesionId") ?? "");
  const { error } = await createAdminClient().rpc("reservar_clase", {
    p_user: persona,
    p_sesion: sesionId,
    p_admin: user.id,
  });
  if (error) return { error: error.message };
  after(() => avisarReserva(persona, sesionId));

  revalidatePath("/admin/clases");
  return { mensaje: "Alumno apuntado. Se ha descontado una clase de su bono." };
}

// Quita a alguien de una clase, devolviéndole o no la clase.
export async function quitarApuntado(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin();

  const devolver = formData.get("devolver") === "si";
  const reservaId = String(formData.get("reservaId") ?? "");
  const admin = createAdminClient();
  const { data: reserva } = await admin.from("reservas").select("sesion_id").eq("id", reservaId).maybeSingle();
  const { data, error } = await admin.rpc("cancelar_reserva", {
    p_user: user.id,
    p_reserva: reservaId,
    p_admin: user.id,
    p_devolver: devolver,
  });
  if (error) return { error: error.message };
  if (reserva) after(() => avisarPlazaLiberada(reserva.sesion_id));

  revalidatePath("/admin/clases");
  return {
    mensaje: data === "devuelta" ? "Quitado. Se le ha devuelto la clase." : "Quitado sin devolver la clase.",
  };
}

// Horas de cancelación, días de antelación y si los alumnos ven a los apuntados.
export async function cambiarAjustes(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const horas = entero(formData.get("horas"));
  const horasInd = entero(formData.get("horas_individual"));
  const dias = entero(formData.get("dias"));
  const ver = formData.get("ver") === "on";
  if (!(horas >= 0 && horas <= 72)) return { error: "Las horas de cancelación van de 0 a 72." };
  if (!(horasInd >= 0 && horasInd <= 72)) return { error: "Las horas de cancelación van de 0 a 72." };
  if (!(dias >= 1 && dias <= 60)) return { error: "Los días de antelación van de 1 a 60." };

  const ahora = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("ajustes")
    .upsert([
      { clave: "cancelacion_horas", valor: String(horas), actualizado_en: ahora },
      { clave: "cancelacion_horas_individual", valor: String(horasInd), actualizado_en: ahora },
      { clave: "reserva_dias_max", valor: String(dias), actualizado_en: ahora },
      { clave: "ver_apuntados", valor: ver ? "true" : "false", actualizado_en: ahora },
    ]);
  if (error) return { error: "No se han podido guardar los ajustes." };

  revalidatePath("/admin/clases");
  return { mensaje: "Ajustes guardados." };
}

// Plazas por defecto y mínimo de alumnos de cada tipo de clase.
export async function cambiarTipo(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = String(formData.get("tipoId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const plazas = entero(formData.get("plazas_max"));
  const minimo = entero(formData.get("minimo_alumnos"));
  const prueba = entero(formData.get("plazas_prueba"));
  const duracion = entero(formData.get("duracion_min"));
  const activo = formData.get("activo") === "on";
  const color = String(formData.get("color") ?? "");
  if (color && !colorValido(color)) return { error: "Color no válido." };
  const colorTexto = String(formData.get("color_texto") ?? "");
  if (colorTexto && !colorValido(colorTexto)) return { error: "Color de letra no válido." };
  const orden = entero(formData.get("orden"));
  if (!(orden >= 0 && orden <= 9999)) return { error: "El orden va de 0 a 9999." };
  const listaEspera = formData.get("lista_espera") === "on";
  const diasReserva = String(formData.get("reserva_dias_max") ?? "").trim() === "" ? null : entero(formData.get("reserva_dias_max"));
  const horasCancelar = String(formData.get("cancelacion_horas") ?? "").trim() === "" ? null : entero(formData.get("cancelacion_horas"));
  const creditos = entero(formData.get("creditos"));
  if (diasReserva !== null && !(diasReserva >= 1 && diasReserva <= 365)) return { error: "Los días para reservar van de 1 a 365 (o déjalo vacío)." };
  if (horasCancelar !== null && !(horasCancelar >= 0 && horasCancelar <= 168)) return { error: "Las horas para cancelar van de 0 a 168 (o déjalo vacío)." };
  if (!(creditos >= 1 && creditos <= 20)) return { error: "Los créditos van de 1 a 20." };
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const descripcionEn = String(formData.get("descripcion_en") ?? "").trim();
  if (descripcion.length > 1500 || descripcionEn.length > 1500) return { error: "Las descripciones pueden tener hasta 1500 letras." };
  if (nombre.length < 1 || nombre.length > 60) return { error: "El nombre tiene que tener entre 1 y 60 letras." };
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(minimo >= 0 && minimo <= plazas)) {
    return { error: "El mínimo no puede ser mayor que las plazas." };
  }
  if (!(prueba >= 0 && prueba <= plazas)) {
    return { error: "Las plazas de prueba no pueden ser más que las plazas de la clase." };
  }
  if (!(duracion >= 10 && duracion <= 240)) return { error: "La duración va de 10 a 240 minutos." };

  const { error } = await createAdminClient()
    .from("tipos_clase")
    .update({
      nombre,
      plazas_max: plazas,
      minimo_alumnos: minimo,
      plazas_prueba: prueba,
      duracion_min: duracion,
      activo,
      orden,
      lista_espera: listaEspera,
      reserva_dias_max: diasReserva,
      cancelacion_horas: horasCancelar,
      creditos,
      color_texto: colorTexto || null,
      descripcion: descripcion || null,
      descripcion_en: descripcionEn || null,
      ...(color ? { color } : {}),
    })
    .eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un tipo de clase con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/admin/clases");
  revalidatePath("/admin/horarios");
  return { mensaje: "Guardado. Las clases nuevas usarán estos datos; las que ya existen no cambian." };
}

// Crea un tipo de clase nuevo (por ejemplo «Movilidad»).
export async function crearTipo(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const servicio = String(formData.get("servicio") ?? "grupal");
  const plazas = entero(formData.get("plazas_max"));
  const minimo = entero(formData.get("minimo_alumnos"));
  const prueba = servicio === "individual" ? 0 : entero(formData.get("plazas_prueba"));
  const duracion = entero(formData.get("duracion_min"));
  if (servicio !== "grupal" && servicio !== "individual") return { error: "Elige si es grupal o individual." };
  if (nombre.length < 1 || nombre.length > 60) return { error: "Escribe un nombre (hasta 60 letras)." };
  if (!(plazas >= 1 && plazas <= 100)) return { error: "Plazas entre 1 y 100." };
  if (!(minimo >= 0 && minimo <= plazas)) return { error: "El mínimo no puede ser mayor que las plazas." };
  if (!(prueba >= 0 && prueba <= plazas)) {
    return { error: "Las plazas de prueba no pueden ser más que las plazas de la clase." };
  }
  if (!(duracion >= 10 && duracion <= 240)) return { error: "La duración va de 10 a 240 minutos." };

  // Color automático: el primero de la paleta que no usa otro tipo (después se puede cambiar).
  const admin = createAdminClient();
  const { data: existentes } = await admin.from("tipos_clase").select("color, orden");
  const siguienteOrden = Math.max(0, ...(existentes ?? []).map((e) => Number(e.orden) || 0)) + 10;
  const color = servicio === "individual" ? "#2B2B2A" : colorLibre((existentes ?? []).map((e) => e.color));

  const { error } = await admin.from("tipos_clase").insert({
    color,
    nombre,
    plazas_max: plazas,
    minimo_alumnos: minimo,
    plazas_prueba: prueba,
    duracion_min: duracion,
    servicio,
    orden: siguienteOrden,
    lista_espera: formData.get("lista_espera") === "on",
  });
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un tipo de clase con ese nombre." : "No se ha podido crear." };
  }

  revalidatePath("/admin/clases");
  revalidatePath("/admin/horarios");
  return { mensaje: "Tipo de clase creado. Ya puedes añadirlo a una plantilla de horario." };
}

// Copia un tipo de clase (con todos sus ajustes) para no empezar de cero.
export async function duplicarTipo(tipoId: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: origen } = await admin
    .from("tipos_clase")
    .select("nombre, plazas_max, minimo_alumnos, plazas_prueba, duracion_min, activo, servicio, color, color_texto, lista_espera, reserva_dias_max, cancelacion_horas, creditos, descripcion, descripcion_en")
    .eq("id", tipoId)
    .maybeSingle();
  if (!origen) return { error: "No se ha encontrado esa clase." };

  const { data: existentes } = await admin.from("tipos_clase").select("nombre, orden");
  const nombres = new Set((existentes ?? []).map((e) => e.nombre));
  let nombre = `${origen.nombre} (copia)`;
  for (let n = 2; nombres.has(nombre); n++) nombre = `${origen.nombre} (copia ${n})`;
  const orden = Math.max(0, ...(existentes ?? []).map((e) => Number(e.orden) || 0)) + 10;

  const { error } = await admin.from("tipos_clase").insert({ ...origen, nombre, orden });
  if (error) return { error: "No se ha podido duplicar." };

  revalidatePath("/admin/clases");
  return { mensaje: `Creada «${nombre}». Cámbiale lo que haga falta.` };
}

// Elimina un tipo de clase. Si ya tiene clases publicadas o está en una plantilla, no se puede: se desactiva.
export async function eliminarTipo(tipoId: string): Promise<Estado> {
  await requireAdmin();
  const { error } = await createAdminClient().from("tipos_clase").delete().eq("id", tipoId);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "No se puede eliminar porque ya tiene clases publicadas o está en una plantilla. Edítala y desmarca «Activo» para que no se creen más."
          : "No se ha podido eliminar.",
    };
  }
  revalidatePath("/admin/clases");
  revalidatePath("/admin/horarios");
  return { mensaje: "Clase eliminada." };
}
