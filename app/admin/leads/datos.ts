import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_INICIALES, ETIQUETAS_INICIALES, TIPOS_INICIALES, type EstadoLead, type ItemColor } from "./tipos";

// De quién son los leads: de la administradora más antigua (la entrenadora). Las demás administradoras ven y editan los mismos leads, estados, etiquetas, tipos y conexiones.
export async function duenoDeLeads(): Promise<string> {
  const { data } = await createAdminClient().from("profiles").select("id").eq("rol", "admin").order("creado_en", { ascending: true }).limit(1).maybeSingle();
  if (!data) throw new Error("No hay ninguna administradora.");
  return data.id as string;
}

// Los estados de un entrenador. La primera vez se le crean los de por defecto.
export async function estadosDe(entrenadorId: string): Promise<EstadoLead[]> {
  const admin = createAdminClient();
  const leer = () => admin.from("leads_estados").select("id, nombre, orden, es_ganado, color").eq("entrenador_id", entrenadorId).order("orden");
  const { data } = await leer();
  if (data && data.length > 0) return data as EstadoLead[];
  await admin
    .from("leads_estados")
    .upsert(
      ESTADOS_INICIALES.map((e, i) => ({ entrenador_id: entrenadorId, nombre: e.nombre, orden: i, es_ganado: e.ganado, color: e.color })),
      { onConflict: "entrenador_id,nombre", ignoreDuplicates: true },
    );
  const { data: creados } = await leer();
  return (creados ?? []) as EstadoLead[];
}

// Sus etiquetas y sus tipos de lead. La primera vez se le crean unos de ejemplo; después son suyos (si los quita todos, no vuelven a salir).
export async function catalogosDe(entrenadorId: string): Promise<{ etiquetas: ItemColor[]; tipos: ItemColor[] }> {
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("leads_catalogos_iniciados").eq("id", entrenadorId).maybeSingle();
  if (perfil && !perfil.leads_catalogos_iniciados) {
    await admin.from("leads_etiquetas").upsert(
      ETIQUETAS_INICIALES.map((e, i) => ({ entrenador_id: entrenadorId, nombre: e.nombre, color: e.color, orden: i })),
      { onConflict: "entrenador_id,nombre", ignoreDuplicates: true },
    );
    await admin.from("leads_tipos").upsert(
      TIPOS_INICIALES.map((e, i) => ({ entrenador_id: entrenadorId, nombre: e.nombre, color: e.color, orden: i })),
      { onConflict: "entrenador_id,nombre", ignoreDuplicates: true },
    );
    await admin.from("profiles").update({ leads_catalogos_iniciados: true }).eq("id", entrenadorId);
  }
  const [{ data: etiquetas }, { data: tipos }] = await Promise.all([
    admin.from("leads_etiquetas").select("id, nombre, color, orden").eq("entrenador_id", entrenadorId).order("orden"),
    admin.from("leads_tipos").select("id, nombre, color, orden").eq("entrenador_id", entrenadorId).order("orden"),
  ]);
  return { etiquetas: (etiquetas ?? []) as ItemColor[], tipos: (tipos ?? []) as ItemColor[] };
}
