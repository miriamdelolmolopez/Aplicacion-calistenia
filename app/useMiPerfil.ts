"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { aceptadoVigente, versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

export type MiPerfil = {
  id: string;
  nombre: string;
  rol: string;
  servicios: string[]; // los marcados en su perfil y los de sus bonos
  planOnline: boolean; // tiene un plan online activo ahora mismo
  datosCompletos: boolean;
  legalAceptado: boolean; // ha aceptado la versión vigente de los textos legales
};

// null = cargando · "anonimo" = no ha iniciado sesión
export type Estado = MiPerfil | null | "anonimo";

async function cargarPerfil(): Promise<Estado> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) return "anonimo";
  const id = sesion.session.user.id;

  const [{ data: perfil }, { data: servicios }, { data: bonos }, { data: plan }, { data: aceptaciones }, versiones] = await Promise.all([
    supabase.from("profiles").select("nombre, rol, datos_completos").eq("id", id).maybeSingle(),
    supabase.from("perfil_servicios").select("servicio").eq("user_id", id),
    supabase.from("bonos").select("servicio").in("estado", ["activo", "en_cola"]),
    supabase.rpc("mi_plan_online"),
    supabase.from("consentimientos").select("tipo, version").eq("user_id", id),
    versionesVigentes(supabase),
  ]);
  if (!perfil) return "anonimo";

  return {
    id,
    nombre: perfil.nombre ?? "",
    rol: perfil.rol,
    servicios: [...new Set([...(servicios ?? []).map((s) => s.servicio), ...(bonos ?? []).map((b) => b.servicio)])],
    planOnline: plan === true,
    datosCompletos: !!perfil.datos_completos,
    legalAceptado: aceptadoVigente(aceptaciones, versiones),
  };
}

// La barra de abajo, los menús y la propia pantalla piden el perfil a la vez: se comparte una sola carga
// (y la respuesta se reutiliza unos segundos) en vez de repetir las mismas consultas varias veces.
let cargaCompartida: { inicio: number; promesa: Promise<Estado> } | null = null;
const VIGENCIA_MS = 3000;

function cargarPerfilCompartido(): Promise<Estado> {
  const ahora = Date.now();
  if (!cargaCompartida || ahora - cargaCompartida.inicio > VIGENCIA_MS) {
    cargaCompartida = { inicio: ahora, promesa: cargarPerfil() };
  }
  return cargaCompartida.promesa;
}

// `recargarCon`: si cambia (por ejemplo la ruta), se vuelve a leer el perfil.
export function useMiPerfil(recargarCon?: string): Estado {
  // Se guarda con qué valor de `recargarCon` se leyó, para no actuar con datos de una pantalla anterior.
  const [leido, setLeido] = useState<{ perfil: Estado; con?: string }>({ perfil: null });
  const router = useRouter();
  const ruta = usePathname();
  const perfil = leido.perfil;
  const actualizado = leido.con === recargarCon;

  useEffect(() => {
    cargarPerfilCompartido().then((p) => setLeido({ perfil: p, con: recargarCon }));
  }, [recargarCon]);

  // Si los textos legales cambian, hay que aceptarlos de nuevo para seguir usando la app.
  // Solo se decide con datos recién leídos (si no, tras aceptar volvería a la pantalla de datos).
  useEffect(() => {
    if (!actualizado) return;
    if (perfil && perfil !== "anonimo" && perfil.rol !== "admin" && !perfil.legalAceptado) {
      if (!ruta.startsWith("/datos") && !ruta.startsWith("/legal")) router.replace("/datos");
    }
  }, [perfil, actualizado, ruta, router]);

  return perfil;
}

// Qué secciones ve cada persona según lo que tiene contratado.
export type Seccion = "inicio" | "reservar" | "reservas" | "rutina" | "progreso" | "pagos" | "academia" | "aprende" | "ayuda" | "perfil" | "ajustes" | "admin";

export function seccionesDe(p: MiPerfil): Seccion[] {
  const online = p.servicios.includes("online") || p.planOnline;
  const presencial = p.servicios.includes("grupal") || p.servicios.includes("individual");
  const soloOnline = online && !presencial;

  const lista: Seccion[] = ["inicio"];
  if (p.rol === "admin" || !soloOnline) lista.push("reservar");
  if (p.rol !== "admin" && !soloOnline) lista.push("reservas");
  if (online && p.rol !== "admin") lista.push("rutina");
  // Con entrenamiento online el progreso está dentro de «Entrenamiento»; sin él, tiene su propio botón.
  if (p.rol !== "admin" && !online) lista.push("progreso");
  if (p.rol !== "admin") lista.push("pagos");
  lista.push("academia", "aprende", "ayuda", "perfil", "ajustes");
  if (p.rol === "admin") lista.push("admin");
  return lista;
}

export const RUTAS: Record<Seccion, string> = {
  inicio: "/inicio",
  reservar: "/clases",
  reservas: "/clases/mis-reservas",
  rutina: "/rutina",
  progreso: "/progreso",
  pagos: "/pagos",
  academia: "/academia",
  aprende: "/aprende",
  ayuda: "/ayuda",
  perfil: "/perfil",
  ajustes: "/ajustes",
  admin: "/admin",
};
