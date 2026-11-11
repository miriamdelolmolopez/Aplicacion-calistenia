import "server-only";
import { claveDia } from "@/lib/fechas";
import { notificarApp } from "@/lib/notificaciones";
import { createAdminClient } from "@/lib/supabase/admin";

// Alumnos/as congelados/as (por ejemplo por una lesión). Las columnas llegan con el archivo 096 de Supabase:
// si todavía no está, todo se queda en «nadie está congelado» y no se rompe nada.
export type Congelado = { id: string; desde: string | null; hasta: string | null; motivo: string | null };

export async function congeladosAhora(): Promise<Congelado[]> {
  const { data, error } = await createAdminClient().from("profiles").select("id, congelado_desde, congelado_hasta, congelado_motivo").eq("congelado", true);
  if (error) return [];
  return ((data ?? []) as { id: string; congelado_desde: string | null; congelado_hasta: string | null; congelado_motivo: string | null }[]).map((p) => ({ id: p.id, desde: p.congelado_desde, hasta: p.congelado_hasta, motivo: p.congelado_motivo }));
}

// ¿Está congelado/a ahora mismo? (Si todavía no está el archivo 096, nadie lo está.)
export async function estaCongelado(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("profiles").select("congelado").eq("id", userId).maybeSingle();
  return !error && (data as { congelado?: boolean } | null)?.congelado === true;
}

// Lo deja de nuevo como alumno/a normal y avisa a las administradoras para que decidan qué hacer con su tarifa
// (nueva fecha de fin, clases, etc.). `causa`: «manual» (lo has hecho tú) o «fecha» (ha llegado la fecha que se puso).
export async function descongelar(userId: string, causa: "manual" | "fecha"): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: p, error } = await admin.from("profiles").select("nombre, apellidos, email, congelado, congelado_motivo").eq("id", userId).maybeSingle();
  if (error) return { error: "Falta ejecutar el archivo 096 en Supabase." };
  if (!p) return { error: "No se ha encontrado a esa persona." };
  if (!p.congelado) return {};

  const { error: falloGuardar } = await admin.from("profiles").update({ congelado: false, congelado_hasta: null }).eq("id", userId);
  if (falloGuardar) return { error: "No se ha podido descongelar." };

  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "Una persona";
  const { data: admins } = await admin.from("profiles").select("id").eq("rol", "admin");
  const motivo = (p.congelado_motivo as string | null)?.trim();
  await notificarApp((admins ?? []).map((a) => a.id as string), {
    tipo: "admin_descongelado",
    titulo: `Descongelado/a: ${nombre}`,
    cuerpo: `${causa === "fecha" ? "Ha llegado la fecha de descongelar. " : ""}${motivo ? `Estaba congelado/a por: ${motivo}. ` : ""}Revisa su tarifa: nueva fecha de fin, clases…`.slice(0, 160),
    enlace: `/admin/usuarios/${userId}`,
    ref: `descongelado:${userId}:${new Date().toISOString().slice(0, 16)}`,
  });
  return {};
}

// Cada día: quien tenía una fecha de descongelar que ya ha llegado (hoy o antes) se descongela y salta el aviso.
export async function descongelarVencidos(): Promise<number> {
  const admin = createAdminClient();
  const hoy = claveDia(new Date().toISOString());
  const { data, error } = await admin.from("profiles").select("id").eq("congelado", true).not("congelado_hasta", "is", null).lte("congelado_hasta", hoy);
  if (error) return 0;
  let n = 0;
  for (const p of (data ?? []) as { id: string }[]) {
    const r = await descongelar(p.id, "fecha");
    if (!r.error) n++;
  }
  return n;
}
