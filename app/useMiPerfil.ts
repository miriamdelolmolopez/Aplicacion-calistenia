"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type MiPerfil = {
  id: string;
  nombre: string;
  rol: string;
  servicios: string[]; // los marcados en su perfil y los de sus bonos
  planOnline: boolean; // tiene un plan online activo ahora mismo
  datosCompletos: boolean;
};

// null = cargando · "anonimo" = no ha iniciado sesión
export type Estado = MiPerfil | null | "anonimo";

async function cargarPerfil(): Promise<Estado> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return "anonimo";
  const id = sesion.user.id;

  const [{ data: perfil }, { data: servicios }, { data: bonos }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("nombre, rol, datos_completos").eq("id", id).maybeSingle(),
    supabase.from("perfil_servicios").select("servicio").eq("user_id", id),
    supabase.from("bonos").select("servicio").in("estado", ["activo", "en_cola"]),
    supabase.rpc("mi_plan_online"),
  ]);
  if (!perfil) return "anonimo";

  return {
    id,
    nombre: perfil.nombre ?? "",
    rol: perfil.rol,
    servicios: [...new Set([...(servicios ?? []).map((s) => s.servicio), ...(bonos ?? []).map((b) => b.servicio)])],
    planOnline: plan === true,
    datosCompletos: !!perfil.datos_completos,
  };
}

// `recargarCon`: si cambia (por ejemplo la ruta), se vuelve a leer el perfil.
export function useMiPerfil(recargarCon?: string): Estado {
  const [perfil, setPerfil] = useState<Estado>(null);

  useEffect(() => {
    cargarPerfil().then(setPerfil);
  }, [recargarCon]);

  return perfil;
}

// Qué secciones ve cada persona según lo que tiene contratado.
export type Seccion = "inicio" | "reservar" | "rutina" | "progreso" | "pagos" | "perfil" | "ajustes" | "admin";

export function seccionesDe(p: MiPerfil): Seccion[] {
  const online = p.servicios.includes("online") || p.planOnline;
  const presencial = p.servicios.includes("grupal") || p.servicios.includes("individual");
  const soloOnline = online && !presencial;

  const lista: Seccion[] = ["inicio"];
  if (p.rol === "admin" || !soloOnline) lista.push("reservar");
  if (online && p.rol !== "admin") lista.push("rutina");
  if (p.rol !== "admin") lista.push("progreso");
  if (p.rol !== "admin") lista.push("pagos");
  lista.push("perfil", "ajustes");
  if (p.rol === "admin") lista.push("admin");
  return lista;
}

export const RUTAS: Record<Seccion, string> = {
  inicio: "/inicio",
  reservar: "/clases",
  rutina: "/rutina",
  progreso: "/progreso",
  pagos: "/pagos",
  perfil: "/perfil",
  ajustes: "/ajustes",
  admin: "/admin",
};
