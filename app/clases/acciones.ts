"use server";

import { after } from "next/server";
import { avisarAdminCancelacion, avisarAdminReserva, avisarPlazaLiberada, avisarReserva } from "@/lib/avisos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Resultado = {
  ok: boolean;
  codigo?: string; // para el error: se traduce en la pantalla
  devuelta?: boolean;
};

// Los mensajes de la base de datos están en español; aquí se convierten en códigos
// para poder enseñarlos en el idioma de cada persona.
const ERRORES: [string, string][] = [
  ["reservada para la lista", "prioridad"],
  ["Completa tus datos", "datos"],
  ["Ya has usado", "pruebaUsada"],
  ["No quedan plazas de clase de prueba", "sinPruebas"],
  ["no admite clase de prueba", "noPrueba"],
  ["todavía tiene plazas libres", "hayPlazas"],
  ["apuntarse a la lista", "soloAlumnosEspera"],
  ["completa", "completa"],
  ["está cancelada", "cancelada"],
  ["ya ha empezado", "empezada"],
  ["Todavía no se puede", "pronto"],
  ["Solo los alumnos", "soloAlumnos"],
  ["Ya tienes plaza", "yaTienes"],
  ["ningún bono activo", "sinBono"],
  ["caduca antes", "caduca"],
  ["no es tuya", "noTuya"],
  ["ya estaba cancelada", "yaCancelada"],
];

function codigoDe(mensaje: string): string {
  return ERRORES.find(([trozo]) => mensaje.includes(trozo))?.[1] ?? "general";
}

async function personaActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function reservarClase(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("reservar_clase", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  after(() => Promise.all([avisarReserva(user.id, sesionId), avisarAdminReserva(user.id, sesionId)]));
  return { ok: true };
}

export async function unirseListaEspera(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("unirse_lista_espera", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function salirListaEspera(sesionId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("salir_lista_espera", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function cancelarMiReserva(reservaId: string): Promise<Resultado> {
  const user = await personaActual();
  if (!user) return { ok: false, codigo: "sesion" };

  const admin = createAdminClient();
  const { data: reserva } = await admin
    .from("reservas")
    .select("sesion_id")
    .eq("id", reservaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data, error } = await admin.rpc("cancelar_reserva", {
    p_user: user.id,
    p_reserva: reservaId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  if (reserva) {
    after(() => Promise.all([avisarPlazaLiberada(reserva.sesion_id), avisarAdminCancelacion(user.id, reserva.sesion_id, data === "devuelta")]));
  }
  return { ok: true, devuelta: data === "devuelta" };
}

export type Apuntado = {
  reservaId: string;
  userId: string;
  nombre: string;
  esPrueba: boolean;
  asistencia: "asistio" | "no_asistio" | null;
};

// Quién está apuntado a una clase, con lo necesario para abrir su ficha o marcar que no vino. Solo la administradora.
export async function obtenerApuntadosClase(sesionId: string): Promise<Apuntado[]> {
  const user = await personaActual();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (yo?.rol !== "admin") return [];

  const { data } = await admin
    .from("reservas")
    .select("id, user_id, es_prueba, asistencia")
    .eq("sesion_id", sesionId)
    .eq("estado", "reservada")
    .order("creado_en");
  const reservas = (data ?? []) as { id: string; user_id: string; es_prueba: boolean; asistencia: "asistio" | "no_asistio" | null }[];
  if (reservas.length === 0) return [];

  const { data: perfiles } = await admin
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .in("id", reservas.map((r) => r.user_id));
  const nombres = new Map(
    ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null }[]).map((p) => [
      p.id,
      [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "Sin nombre",
    ]),
  );
  return reservas.map((r) => ({
    reservaId: r.id,
    userId: r.user_id,
    nombre: nombres.get(r.user_id) ?? "Sin nombre",
    esPrueba: r.es_prueba,
    asistencia: r.asistencia,
  }));
}

export type ClasePasada = {
  id: string;
  tipo: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  ocupadas: number;
  mi_reserva: null;
  apuntados: string[];
  apuntados_ids: string[];
  plazas_prueba: number;
  ocupadas_prueba: number;
  en_espera: false;
  posicion: 0;
  hay_espera: 0;
  prioridad: false;
  duracion_min: number;
  servicio: string;
  incluido: true;
};

// Las clases que ya han pasado, con quién estaba apuntado. Solo para la administradora.
export async function obtenerClasesPasadas(semanas: number): Promise<ClasePasada[]> {
  const user = await personaActual();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (yo?.rol !== "admin") return [];

  const ahora = Date.now();
  const { data: sesiones } = await admin
    .from("sesiones_clase")
    .select("id, empieza_en, plazas, estado, plazas_prueba, tipos_clase(nombre, duracion_min, servicio)")
    .gte("empieza_en", new Date(ahora - semanas * 7 * 86400000).toISOString())
    .lt("empieza_en", new Date(ahora).toISOString())
    .order("empieza_en");
  type Fila = { id: string; empieza_en: string; plazas: number; estado: string; plazas_prueba: number; tipos_clase: { nombre: string; duracion_min: number; servicio: string } | null };
  const lista = (sesiones ?? []) as unknown as Fila[];
  if (lista.length === 0) return [];

  // Se piden las reservas por tandas para no pasarse del largo de la consulta.
  const ids = lista.map((s) => s.id);
  const tandas: string[][] = [];
  for (let i = 0; i < ids.length; i += 40) tandas.push(ids.slice(i, i + 40));
  const [respuestas, { data: perfiles }] = await Promise.all([
    Promise.all(
      tandas.map((t) =>
        admin.from("reservas").select("sesion_id, user_id, es_prueba, creado_en").in("sesion_id", t).eq("estado", "reservada").order("creado_en"),
      ),
    ),
    admin.from("profiles").select("id, nombre, apellidos").limit(5000),
  ]);
  const reservas = respuestas.flatMap((r) => (r.data ?? []) as { sesion_id: string; user_id: string; es_prueba: boolean }[]);
  const nombres = new Map(
    ((perfiles ?? []) as { id: string; nombre: string | null; apellidos: string | null }[]).map((p) => [
      p.id,
      (p.nombre?.trim().split(" ")[0] || "Alumno") + (p.apellidos?.trim() ? ` ${p.apellidos.trim().charAt(0).toUpperCase()}.` : ""),
    ]),
  );

  return lista.map((s) => {
    const suyas = reservas.filter((r) => r.sesion_id === s.id);
    return {
      id: s.id,
      tipo: s.tipos_clase?.nombre ?? "Clase",
      empieza_en: s.empieza_en,
      plazas: s.plazas,
      estado: s.estado,
      ocupadas: suyas.length,
      mi_reserva: null,
      apuntados: suyas.map((r) => nombres.get(r.user_id) ?? "Alumno"),
      apuntados_ids: suyas.map((r) => r.user_id),
      plazas_prueba: s.plazas_prueba,
      ocupadas_prueba: suyas.filter((r) => r.es_prueba).length,
      en_espera: false,
      posicion: 0,
      hay_espera: 0,
      prioridad: false,
      duracion_min: s.tipos_clase?.duracion_min ?? 60,
      servicio: s.tipos_clase?.servicio ?? "grupal",
      incluido: true,
    } satisfies ClasePasada;
  });
}
