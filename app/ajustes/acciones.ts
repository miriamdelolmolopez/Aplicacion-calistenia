"use server";

import { revalidatePath } from "next/cache";
import { enSoloLectura } from "@/lib/como";
import { createClient } from "@/lib/supabase/server";

export type PreferenciasCuenta = { zona_horaria: string; pais: string; unidad_peso: "kg" | "lb"; unidad_longitud: "cm" | "in" };
const PREFERENCIAS_POR_DEFECTO: PreferenciasCuenta = { zona_horaria: "Europe/Madrid", pais: "ES", unidad_peso: "kg", unidad_longitud: "cm" };

const ZONAS = new Set(Intl.supportedValuesOf("timeZone"));

// Lee las preferencias de la cuenta. Si todavía falta el archivo 101 en Supabase, se devuelven las de siempre.
export async function obtenerPreferenciasCuenta(): Promise<{ valores: PreferenciasCuenta; disponible: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { valores: PREFERENCIAS_POR_DEFECTO, disponible: false };
  const { data, error } = await supabase.from("profiles").select("zona_horaria, pais, unidad_peso, unidad_longitud").eq("id", user.id).maybeSingle();
  if (error || !data) return { valores: PREFERENCIAS_POR_DEFECTO, disponible: false };
  return { valores: data as PreferenciasCuenta, disponible: true };
}

// Guarda un cambio de preferencia (zona horaria, país o unidades) de la persona que llama.
export async function guardarPreferenciaCuenta(clave: keyof PreferenciasCuenta, valor: string): Promise<{ ok: boolean }> {
  if (await enSoloLectura()) return { ok: false };
  if (clave === "zona_horaria" && !ZONAS.has(valor)) return { ok: false };
  if (clave === "pais" && !/^[A-Z]{2}$/.test(valor)) return { ok: false };
  if (clave === "unidad_peso" && !["kg", "lb"].includes(valor)) return { ok: false };
  if (clave === "unidad_longitud" && !["cm", "in"].includes(valor)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("profiles").update({ [clave]: valor }).eq("id", user.id);
  revalidatePath("/ajustes");
  return { ok: !error };
}
