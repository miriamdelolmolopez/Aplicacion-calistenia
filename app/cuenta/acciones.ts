"use server";

import { requireAdmin } from "@/lib/admin";
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
  activoDesde: string | null;
  caducaEn: string | null;
  pagoPendiente: boolean;
};

type Fila = {
  id: string;
  servicio: string;
  estado: string;
  clases_total: number;
  clases_restantes: number;
  activo_desde: string | null;
  caduca_en: string | null;
  tipos_bono: { nombre: string } | null;
  pagos: { estado: string }[];
};

// Devuelve los bonos vigentes de la persona que llama (el activo y los que esperan).
// Antes los pone al día para no enseñar un bono que ya ha caducado.
export async function obtenerMisBonos(): Promise<MiBono[]> {
  const supabase = await createClient();
  const { data: datosSesion } = await supabase.auth.getClaims();
  const userId = datosSesion?.claims?.sub;
  if (!userId) return [];
  return bonosVigentesDe(userId, false);
}

// Lo mismo para otra persona: solo la administradora (para «ver como alumno/a»).
export async function obtenerBonosDe(userId: string): Promise<MiBono[]> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return [];
  return bonosVigentesDe(userId, true);
}

async function bonosVigentesDe(userId: string, comoAdmin: boolean): Promise<MiBono[]> {
  const admin = createAdminClient();
  await admin.rpc("refrescar_bonos", { p_user: userId });

  const { data } = await (comoAdmin ? admin : await createClient())
    .from("bonos")
    .select(
      "id, user_id, servicio, estado, clases_total, clases_restantes, activo_desde, caduca_en, tipos_bono(nombre), pagos(estado)",
    )
    .eq("user_id", userId)
    .in("estado", ["activo", "en_cola", "agotado"])
    .order("creado_en");

  // Un bono sin clases pero todavía dentro de sus fechas sigue siendo su tarifa: se enseña con 0 clases.
  const ahora = new Date().toISOString();
  const filas = ((data ?? []) as unknown as Fila[]).filter((b) => b.estado !== "agotado" || (b.caduca_en && b.caduca_en > ahora));
  // Primero los bonos que se están usando y luego los que esperan, por orden de compra.
  const rango = (e: string) => (e === "activo" ? 0 : e === "agotado" ? 1 : 2);
  const ordenados = [...filas].sort((a, b) => rango(a.estado) - rango(b.estado));

  return ordenados.map((b) => ({
    id: b.id,
    servicio: b.servicio,
    estado: b.estado,
    nombre: b.tipos_bono?.nombre ?? "",
    clasesRestantes: b.clases_restantes,
    clasesTotal: b.clases_total,
    activoDesde: b.activo_desde,
    caducaEn: b.caduca_en,
    pagoPendiente: b.pagos.some((p) => p.estado === "pendiente"),
  }));
}
