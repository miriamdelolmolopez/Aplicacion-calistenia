"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { OPCIONES_MENU_ADMIN, type OpcionMenuAdmin } from "./opcionesMenuAdmin";
import { seccionDeRuta } from "@/lib/seccionesAdmin";
import { createClient } from "@/lib/supabase/client";

// Lo que la administradora elige se guarda en este navegador. Las alumnas no tienen nada de esto: su menú es fijo.
const CLAVE = "menuAdmin"; // qué opciones de la barra lateral se ven
const CLAVE_ORDEN = "menuAdminOrden"; // en qué orden
const CLAVE_BARRA = "barraAdmin"; // qué opciones salen en la barra de abajo (sin Inicio ni «Más»)
const EVENTO = "cambio-menu-admin";

export const MAX_BARRA = 5;
export const BARRA_POR_DEFECTO = ["/admin", "/admin/usuarios", "/admin/reservas", "/perfil"];

// Las secciones del panel que esta administradora tiene excluidas. Se lee una vez por minuto como mucho.
let excluidasGuardadas: { cuando: number; lista: Promise<string[]> } | null = null;
function cargarExcluidas(): Promise<string[]> {
  if (!excluidasGuardadas || Date.now() - excluidasGuardadas.cuando > 60_000) {
    excluidasGuardadas = {
      cuando: Date.now(),
      lista: (async () => {
        try {
          const supabase = createClient();
          const { data: sesion } = await supabase.auth.getSession();
          if (!sesion.session) return [];
          const { data } = await supabase.from("profiles").select("excluidos_admin").eq("id", sesion.session.user.id).maybeSingle();
          return (data?.excluidos_admin as string[] | null) ?? [];
        } catch {
          return [];
        }
      })(),
    };
  }
  return excluidasGuardadas.lista;
}

// Los nombres que la administradora ha puesto a las tarjetas de Administración (también salen en las barras).
let nombresGuardados: { cuando: number; lista: Promise<Record<string, string>> } | null = null;
function cargarNombres(): Promise<Record<string, string>> {
  if (!nombresGuardados || new Date().getTime() - nombresGuardados.cuando > 60_000) {
    nombresGuardados = {
      cuando: new Date().getTime(),
      lista: (async () => {
        try {
          const { data } = await createClient().from("ajustes").select("valor").eq("clave", "nombres_admin").maybeSingle();
          const crudo = JSON.parse(String(data?.valor ?? "{}")) as Record<string, unknown>;
          const limpio: Record<string, string> = {};
          for (const [k, v] of Object.entries(crudo)) if (typeof v === "string" && v.trim()) limpio[k] = v;
          return limpio;
        } catch {
          return {};
        }
      })(),
    };
  }
  return nombresGuardados.lista;
}

// Se llama al cambiar un nombre: las barras lo vuelven a leer enseguida.
export function olvidarNombresMenu() {
  nombresGuardados = null;
  window.dispatchEvent(new Event("nombres-menu-admin"));
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leer(clave: string): string {
  try {
    return localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento no se puede recordar la elección.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function analizar<T>(crudo: string, defecto: T): T {
  try {
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

export function useMenuAdmin(): {
  visibles: OpcionMenuAdmin[]; // barra lateral, ya ordenada
  ordenadas: OpcionMenuAdmin[]; // todo el catálogo, en el orden elegido (para la pantalla de Ajustes)
  estaVisible: (o: OpcionMenuAdmin) => boolean;
  poner: (href: string, visible: boolean) => void;
  mover: (href: string, direccion: -1 | 1) => void;
  ordenar: (hrefs: string[]) => void; // nuevo orden de toda la barra lateral (al arrastrar)
  barra: OpcionMenuAdmin[]; // opciones de la barra de abajo, en orden
  disponiblesBarra: OpcionMenuAdmin[];
  ponerEnBarra: (href: string) => void;
  quitarDeBarra: (href: string) => void;
  moverEnBarra: (href: string, direccion: -1 | 1) => void;
  ordenarBarra: (hrefs: string[]) => void; // nuevo orden de la barra de abajo (al arrastrar)
} {
  const crudo = useSyncExternalStore(suscribir, () => leer(CLAVE), () => "");
  const crudoOrden = useSyncExternalStore(suscribir, () => leer(CLAVE_ORDEN), () => "");
  const crudoBarra = useSyncExternalStore(suscribir, () => leer(CLAVE_BARRA), () => "");

  const elegido = useMemo(() => analizar<Record<string, boolean>>(crudo, {}), [crudo]);
  const orden = useMemo(() => analizar<string[]>(crudoOrden, []), [crudoOrden]);
  const hrefsBarra = useMemo(() => analizar<string[]>(crudoBarra, BARRA_POR_DEFECTO), [crudoBarra]);

  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    let vigente = true;
    const leerNombres = () => cargarNombres().then((n) => vigente && setNombres(n));
    leerNombres();
    window.addEventListener("nombres-menu-admin", leerNombres);
    return () => {
      vigente = false;
      window.removeEventListener("nombres-menu-admin", leerNombres);
    };
  }, []);
  const porHref = useMemo(() => new Map(OPCIONES_MENU_ADMIN.map((o) => [o.href, { ...o, texto: nombres[o.href] ?? o.texto }])), [nombres]);

  // Lo que esta administradora tiene excluido no sale en ningún menú.
  const [excluidas, setExcluidas] = useState<string[]>([]);
  useEffect(() => {
    let vigente = true;
    cargarExcluidas().then((e) => vigente && setExcluidas(e));
    return () => {
      vigente = false;
    };
  }, []);
  const permitida = useCallback((o: OpcionMenuAdmin) => !excluidas.includes(seccionDeRuta(o.href) ?? ""), [excluidas]);

  // Catálogo en el orden elegido: primero lo que ya tiene sitio, después lo nuevo en su orden de siempre.
  const ordenadas = useMemo(() => {
    const conocidas = orden.filter((h) => porHref.has(h));
    const resto = OPCIONES_MENU_ADMIN.filter((o) => !conocidas.includes(o.href)).map((o) => o.href);
    return [...conocidas, ...resto].map((h) => porHref.get(h)!).filter((o) => !o.soloBarra && permitida(o));
  }, [orden, porHref, permitida]);

  const estaVisible = useCallback((o: OpcionMenuAdmin) => o.fijo || (elegido[o.href] ?? o.defecto), [elegido]);
  const visibles = useMemo(() => ordenadas.filter(estaVisible), [ordenadas, estaVisible]);

  const barra = useMemo(() => hrefsBarra.map((h) => porHref.get(h)).filter((o): o is OpcionMenuAdmin => !!o && o.href !== "/inicio" && permitida(o)).slice(0, MAX_BARRA), [hrefsBarra, porHref, permitida]);
  const disponiblesBarra = useMemo(() => OPCIONES_MENU_ADMIN.filter((o) => o.href !== "/inicio" && permitida(o) && !barra.some((b) => b.href === o.href)), [barra, permitida]);

  const mueve = (lista: string[], href: string, direccion: -1 | 1): string[] => {
    const i = lista.indexOf(href);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= lista.length) return lista;
    const copia = [...lista];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  };

  return {
    visibles,
    ordenadas,
    estaVisible,
    poner: (href, visible) => guardar(CLAVE, { ...elegido, [href]: visible }),
    mover: (href, direccion) => guardar(CLAVE_ORDEN, mueve(ordenadas.map((o) => o.href), href, direccion)),
    ordenar: (hrefs) => guardar(CLAVE_ORDEN, hrefs),
    ordenarBarra: (hrefs) => guardar(CLAVE_BARRA, hrefs),
    barra,
    disponiblesBarra,
    ponerEnBarra: (href) => {
      if (barra.length < MAX_BARRA && !barra.some((b) => b.href === href)) guardar(CLAVE_BARRA, [...barra.map((b) => b.href), href]);
    },
    quitarDeBarra: (href) => guardar(CLAVE_BARRA, barra.map((b) => b.href).filter((h) => h !== href)),
    moverEnBarra: (href, direccion) => guardar(CLAVE_BARRA, mueve(barra.map((b) => b.href), href, direccion)),
  };
}
