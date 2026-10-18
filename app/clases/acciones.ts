"use server";

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

  const { data, error } = await createAdminClient().rpc("cancelar_reserva", {
    p_user: user.id,
    p_reserva: reservaId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true, devuelta: data === "devuelta" };
}
