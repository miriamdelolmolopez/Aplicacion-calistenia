"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Activa o desactiva los avisos por email no esenciales de la persona que llama.
export async function cambiarAvisosEmail(activar: boolean): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ avisos_email: !!activar })
    .eq("id", user.id);
  return !error;
}

export type MiBono = {
  id: string;
  servicio: string;
  estado: string;
  nombre: string;
  clasesRestantes: number;
  clasesTotal: number;
  caducaEn: string | null;
  pagoPendiente: boolean;
};

type Fila = {
  id: string;
  servicio: string;
  estado: string;
  clases_total: number;
  clases_restantes: number;
  caduca_en: string | null;
  tipos_bono: { nombre: string } | null;
  pagos: { estado: string }[];
};

// Devuelve los bonos vigentes de la persona que llama (el activo y los que esperan).
// Antes los pone al día para no enseñar un bono que ya ha caducado.
export async function obtenerMisBonos(): Promise<MiBono[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  await createAdminClient().rpc("refrescar_bonos", { p_user: user.id });

  const { data } = await supabase
    .from("bonos")
    .select(
      "id, servicio, estado, clases_total, clases_restantes, caduca_en, tipos_bono(nombre), pagos(estado)",
    )
    .in("estado", ["activo", "en_cola"])
    .order("creado_en");

  const filas = (data ?? []) as unknown as Fila[];
  // Primero el bono que se está gastando y luego los que esperan, por orden de compra.
  const ordenados = [...filas].sort(
    (a, b) => Number(b.estado === "activo") - Number(a.estado === "activo"),
  );

  return ordenados.map((b) => ({
    id: b.id,
    servicio: b.servicio,
    estado: b.estado,
    nombre: b.tipos_bono?.nombre ?? "",
    clasesRestantes: b.clases_restantes,
    clasesTotal: b.clases_total,
    caducaEn: b.caduca_en,
    pagoPendiente: b.pagos.some((p) => p.estado === "pendiente"),
  }));
}
