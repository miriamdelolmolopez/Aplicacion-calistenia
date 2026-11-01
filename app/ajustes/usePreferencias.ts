"use client";

import { useEffect, useState } from "react";
import { versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

export type Preferencias = {
  id: string;
  avisos_reserva: boolean;
  avisos_recordatorio: boolean;
  avisos_bono: boolean;
  avisos_novedades: boolean;
  mostrar_foto: boolean;
  avisar_cumple: boolean;
  imagen: boolean;
  borradoPedido: boolean;
};

export type Clave = "avisos_reserva" | "avisos_recordatorio" | "avisos_bono" | "avisos_novedades" | "mostrar_foto" | "avisar_cumple";

async function cargar(): Promise<Preferencias | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const [{ data: p }, { data: s }, { data: im }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, avisos_reserva, avisos_recordatorio, avisos_bono, avisos_novedades, mostrar_foto, avisar_cumple")
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
  ]);
  return p
    ? { ...(p as Omit<Preferencias, "borradoPedido" | "imagen">), imagen: im?.[0]?.concedido === true, borradoPedido: (s ?? []).length > 0 }
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

  // La autorización de imagen se guarda como una fila nueva cada vez (queda el historial); vale la más reciente.
  async function cambiarImagen(valor: boolean) {
    if (!pref) return;
    setPref({ ...pref, imagen: valor });
    const supabase = createClient();
    const versiones = await versionesVigentes(supabase);
    const { error } = await supabase.from("consentimientos").insert({ user_id: pref.id, tipo: "imagen", version: versiones.terminos, concedido: valor });
    if (error) setPref((p) => (p ? { ...p, imagen: !valor } : p));
  }

  return { pref, setPref, cambiar, cambiarImagen };
}
