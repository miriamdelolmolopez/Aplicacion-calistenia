"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; codigo?: string; id?: string };

// Los mensajes de la base de datos están en español; aquí se convierten en códigos para
// poder enseñarlos en el idioma de cada persona.
const ERRORES: [string, string][] = [
  ["plan online", "planInactivo"],
  ["en curso", "yaEnCurso"],
  ["rutina publicada", "noPublicada"],
  ["ninguna serie", "sinSeries"],
  ["duración", "duracion"],
  ["ya terminado", "terminado"],
  ["ya completada", "completada"],
  ["completada", "completada"],
  ["al menos una serie", "unaSerie"],
  ["más de 20", "maxSeries"],
];

function codigoDe(mensaje: string): string {
  return ERRORES.find(([trozo]) => mensaje.includes(trozo))?.[1] ?? "general";
}

async function persona() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function numeroOpc(valor: number | null | undefined): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export async function iniciarEntreno(sesionId: string): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { data, error } = await createAdminClient().rpc("iniciar_entreno", {
    p_user: user.id,
    p_sesion: sesionId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true, id: data as string };
}

export type DatosSerie = {
  reps: number | null;
  segundos: number | null;
  peso: number | null;
  distancia: number | null;
  detalle: string;
  completada: boolean;
};

export async function guardarSerie(serieId: string, d: DatosSerie): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("guardar_serie", {
    p_user: user.id,
    p_serie: serieId,
    p_reps: numeroOpc(d.reps),
    p_segundos: numeroOpc(d.segundos),
    p_peso: numeroOpc(d.peso),
    p_distancia: numeroOpc(d.distancia),
    p_detalle: (d.detalle ?? "").slice(0, 60),
    p_completada: !!d.completada,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function agregarSerie(entrenoId: string, ordenEjercicio: number): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { data, error } = await createAdminClient().rpc("agregar_serie", {
    p_user: user.id,
    p_entreno: entrenoId,
    p_orden_ejercicio: ordenEjercicio,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true, id: data as string };
}

export async function quitarSerie(serieId: string): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("quitar_serie", {
    p_user: user.id,
    p_serie: serieId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function finalizarEntreno(entrenoId: string, duracionSeg?: number): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("finalizar_entreno", {
    p_user: user.id,
    p_entreno: entrenoId,
    p_duracion_seg: duracionSeg && duracionSeg > 0 ? Math.round(duracionSeg) : null,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

export async function descartarEntreno(entrenoId: string): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient().rpc("descartar_entreno", {
    p_user: user.id,
    p_entreno: entrenoId,
  });
  if (error) return { ok: false, codigo: codigoDe(error.message) };
  return { ok: true };
}

// Borra un entreno ya terminado de la persona que llama (y sus series). No se puede deshacer.
export async function borrarEntreno(entrenoId: string): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const { error } = await createAdminClient()
    .from("entrenos")
    .delete()
    .eq("id", entrenoId)
    .eq("user_id", user.id)
    .eq("estado", "terminado");
  if (error) return { ok: false, codigo: "general" };
  return { ok: true };
}
