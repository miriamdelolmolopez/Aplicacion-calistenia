"use client";

import { useEffect, useState } from "react";
import { versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

export type ClaveAdmin = "admin_avisa_reserva" | "admin_avisa_cancelacion" | "admin_avisa_minimo" | "admin_avisa_regalos" | "admin_avisa_borrado";
export const CLAVES_ADMIN: ClaveAdmin[] = ["admin_avisa_reserva", "admin_avisa_cancelacion", "admin_avisa_minimo", "admin_avisa_regalos", "admin_avisa_borrado"];

export type Preferencias = {
  id: string;
  rol: string;
  avisos_reserva: boolean;
  avisos_recordatorio: boolean;
  avisos_bono: boolean;
  avisos_novedades: boolean;
  mostrar_foto: boolean;
  mostrar_apellido: boolean;
  avisos_cancelacion: boolean;
  avisos_bono_clases: boolean;
  avisos_inactividad: boolean;
  avisos_cumpleanos: boolean;
  avisar_cumple: boolean;
  imagen: boolean;
  borradoPedido: boolean;
} & Record<ClaveAdmin, boolean>;

export type Clave = "avisos_reserva" | "avisos_recordatorio" | "avisos_bono" | "avisos_novedades" | "mostrar_foto" | "mostrar_apellido" | "avisar_cumple" | "avisos_cancelacion" | "avisos_bono_clases" | "avisos_inactividad" | "avisos_cumpleanos" | ClaveAdmin;

async function cargar(): Promise<Preferencias | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const [{ data: p }, { data: s }, { data: im }, { data: ad }, { data: ap }, { data: av }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, rol, avisos_reserva, avisos_recordatorio, avisos_bono, avisos_novedades, mostrar_foto, avisar_cumple")
      .eq("id", sesion.user.id)
      .maybeSingle(),
    supabase.from("solicitudes_borrado").select("id").eq("atendida", false).limit(1),
    supabase
      .from("consentimientos")
      .select("concedido")
      .eq("user_id", sesion.user.id)
      .eq("tipo", "imagen")
      .order("aceptado_en", { ascending: false })
      .limit(1),
    // Los avisos de la administradora van aparte: si la columna aún no existe, se dan por activados.
    supabase.from("profiles").select(CLAVES_ADMIN.join(", ")).eq("id", sesion.user.id).maybeSingle(),
    // «Mostrar mi apellido» va aparte: si la columna aún no existe, se da por desactivada.
    supabase.from("profiles").select("mostrar_apellido").eq("id", sesion.user.id).maybeSingle(),
    // Los avisos por tipo van aparte: si todavía falta el archivo 073, se dan por activados.
    supabase.from("profiles").select("avisos_cancelacion, avisos_bono_clases, avisos_inactividad, avisos_cumpleanos").eq("id", sesion.user.id).maybeSingle(),
  ]);
  const admin = Object.fromEntries(CLAVES_ADMIN.map((c) => [c, (ad as unknown as Record<string, boolean> | null)?.[c] !== false])) as Record<ClaveAdmin, boolean>;
  return p
    ? { ...(p as Omit<Preferencias, "borradoPedido" | "imagen" | "mostrar_apellido" | "avisos_cancelacion" | "avisos_bono_clases" | "avisos_inactividad" | "avisos_cumpleanos" | ClaveAdmin>), ...admin, mostrar_apellido: (ap as { mostrar_apellido?: boolean } | null)?.mostrar_apellido === true,
        ...(Object.fromEntries(["avisos_cancelacion", "avisos_bono_clases", "avisos_inactividad", "avisos_cumpleanos"].map((c) => [c, (av as unknown as Record<string, boolean> | null)?.[c] !== false])) as Record<"avisos_cancelacion" | "avisos_bono_clases" | "avisos_inactividad" | "avisos_cumpleanos", boolean>), imagen: im?.[0]?.concedido === true, borradoPedido: (s ?? []).length > 0 }
    : null;
}

// Las preferencias de la persona: se leen una vez y cada cambio se guarda al momento.
export function usePreferencias() {
  const [pref, setPref] = useState<Preferencias | null>(null);

  useEffect(() => {
    cargar().then(setPref);
  }, []);

  async function cambiar(clave: Clave, valor: boolean) {
    if (!pref) return;
    setPref({ ...pref, [clave]: valor });
    const { error } = await createClient().from("profiles").update({ [clave]: valor }).eq("id", pref.id);
    if (error) setPref((p) => (p ? { ...p, [clave]: !valor } : p));
  }

  // Cambia varias casillas a la vez (por ejemplo «todos los correos opcionales»).
  async function cambiarVarios(claves: Clave[], valor: boolean) {
    if (!pref) return;
    const antes = pref;
    const cambios = Object.fromEntries(claves.map((c) => [c, valor]));
    setPref({ ...pref, ...cambios });
    const { error } = await createClient().from("profiles").update(cambios).eq("id", pref.id);
    if (error) setPref(antes);
  }

  // La autorización de imagen se guarda como una fila nueva cada vez (queda el historial); vale la más reciente.
  async function cambiarImagen(valor: boolean) {
    if (!pref) return;
    setPref({ ...pref, imagen: valor });
    const supabase = createClient();
    const versiones = await versionesVigentes(supabase);
    const { error } = await supabase.from("consentimientos").insert({ user_id: pref.id, tipo: "imagen", version: versiones.terminos, concedido: valor });
    if (error) setPref((p) => (p ? { ...p, imagen: !valor } : p));
  }

  return { pref, setPref, cambiar, cambiarVarios, cambiarImagen };
}
