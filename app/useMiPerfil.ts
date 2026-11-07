"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { aceptadoVigente, versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

export type MiPerfil = {
  id: string;
  nombre: string;
  rol: string; // el que se usa para pintar la app (con «vista de alumna» una administradora sale como alumna)
  rolReal: string; // el de verdad; manda en los permisos
  servicios: string[]; // los marcados en su perfil y los de sus bonos
  planOnline: boolean; // tiene un plan online activo ahora mismo
  datosCompletos: boolean;
  sexoFalta: boolean; // ya rellenó sus datos, pero antes de que el sexo fuera obligatorio: hay que pedírselo
  legalAceptado: boolean; // ha aceptado la versión vigente de los textos legales
};

// null = cargando · "anonimo" = no ha iniciado sesión
export type Estado = MiPerfil | null | "anonimo";

// Una administradora puede ver la app como la ve una alumna. Solo cambia lo que se muestra: los permisos siguen siendo los suyos.
const CLAVE_VISTA_ALUMNA = "vistaAlumna";

export function vistaAlumnaActiva(): boolean {
  try {
    return localStorage.getItem(CLAVE_VISTA_ALUMNA) === "1";
  } catch {
    return false;
  }
}

const CLAVE_VOLVER = "vistaAlumnaVolver";

// Activa o apaga la vista de alumno/a. Al activarla se puede elegir la pantalla a la que ir (por defecto Inicio),
// y al apagarla se vuelve a la pantalla de administración desde la que se salió.
export function cambiarVistaAlumna(activar: boolean, destino?: string) {
  let volver: string | null = null;
  try {
    if (activar) {
      localStorage.setItem(CLAVE_VISTA_ALUMNA, "1");
      sessionStorage.setItem(CLAVE_VOLVER, location.pathname + location.search);
    } else {
      localStorage.removeItem(CLAVE_VISTA_ALUMNA);
      volver = sessionStorage.getItem(CLAVE_VOLVER);
      sessionStorage.removeItem(CLAVE_VOLVER);
    }
  } catch {
    // Sin almacenamiento no se puede cambiar de vista.
  }
  window.location.href = activar ? (destino ?? "/inicio") : volver && volver.startsWith("/admin") ? volver : "/inicio";
}

export function olvidarVistaAlumna() {
  try {
    localStorage.removeItem(CLAVE_VISTA_ALUMNA);
  } catch {
    // Nada que olvidar.
  }
}

async function cargarPerfil(): Promise<Estado> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion.session) return "anonimo";
  const id = sesion.session.user.id;

  const [{ data: perfil }, { data: servicios }, { data: bonos }, { data: plan }, { data: aceptaciones }, versiones] = await Promise.all([
    supabase.from("profiles").select("nombre, rol, datos_completos, sexo").eq("id", id).maybeSingle(),
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
    rol: perfil.rol === "admin" && vistaAlumnaActiva() ? "alumno" : perfil.rol,
    rolReal: perfil.rol,
    servicios: [...new Set([...(servicios ?? []).map((s) => s.servicio), ...(bonos ?? []).map((b) => b.servicio)])],
    planOnline: plan === true,
    datosCompletos: !!perfil.datos_completos,
    sexoFalta: !!perfil.datos_completos && !perfil.sexo,
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

// Hay que llamarla justo después de cambiar algo que afecta al perfil (por ejemplo, al guardar los datos obligatorios),
// para que la pantalla siguiente lea el perfil nuevo y no el de hace unos segundos.
export function olvidarPerfilCargado() {
  cargaCompartida = null;
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
  // Antes de mandar a nadie a «Datos» se vuelve a leer el perfil: un componente que ya estaba en pantalla puede tener
  // el de hace un momento (antes de guardar los datos y aceptar los textos) y, sin esta comprobación, se entraba en bucle.
  useEffect(() => {
    if (!actualizado) return;
    if (perfil && perfil !== "anonimo" && perfil.rolReal !== "admin" && (!perfil.legalAceptado || perfil.sexoFalta)) {
      if (ruta.startsWith("/datos") || ruta.startsWith("/legal") || ruta.startsWith("/crear-contrasena")) return;
      let vigente = true;
      olvidarPerfilCargado();
      cargarPerfilCompartido().then((p) => {
        if (!vigente) return;
        if (p && p !== "anonimo" && p.rolReal !== "admin" && (!p.legalAceptado || p.sexoFalta)) router.replace("/datos");
        else setLeido({ perfil: p, con: recargarCon });
      });
      return () => {
        vigente = false;
      };
    }
  }, [perfil, actualizado, ruta, router, recargarCon]);

  return perfil;
}

// Qué secciones ve cada persona según lo que tiene contratado.
export type Seccion = "inicio" | "reservar" | "reservas" | "rutina" | "biblioteca" | "progreso" | "pagos" | "academia" | "aprende" | "tablon" | "ayuda" | "perfil" | "ajustes" | "admin";

export function seccionesDe(p: MiPerfil): Seccion[] {
  const online = p.servicios.includes("online") || p.planOnline;
  const presencial = p.servicios.includes("grupal") || p.servicios.includes("individual") || p.servicios.includes("taller");
  const soloOnline = online && !presencial;

  const lista: Seccion[] = ["inicio"];
  if (p.rol === "admin" || !soloOnline) lista.push("reservar");
  if (p.rol !== "admin" && !soloOnline) lista.push("reservas");
  if (online && p.rol !== "admin") lista.push("rutina", "biblioteca");
  // El progreso tiene su propia sección para todas las alumnas (con online incluye las gráficas de ejercicios).
  if (p.rol !== "admin") lista.push("progreso");
  if (p.rol !== "admin") lista.push("pagos");
  lista.push("academia", "aprende");
  if (p.rol !== "admin") lista.push("tablon");
  lista.push("ayuda", "perfil", "ajustes");
  if (p.rol === "admin") lista.push("admin");
  return lista;
}

export const RUTAS: Record<Seccion, string> = {
  inicio: "/inicio",
  reservar: "/clases",
  reservas: "/clases/mis-reservas",
  rutina: "/rutina",
  biblioteca: "/biblioteca",
  progreso: "/progreso",
  pagos: "/pagos",
  academia: "/academia",
  aprende: "/aprende",
  tablon: "/tablon",
  ayuda: "/ayuda",
  perfil: "/perfil",
  ajustes: "/ajustes",
  admin: "/admin",
};
