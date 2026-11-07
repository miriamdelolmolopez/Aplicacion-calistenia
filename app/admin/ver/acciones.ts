"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AlumnoVer = { id: string; nombre: string; detalle: string };

// Para elegir como qué persona se quiere ver la app. Solo la administradora.
export async function buscarAlumnosParaVer(texto: string): Promise<AlumnoVer[]> {
  await requireAdmin();
  const t = String(texto ?? "").trim().replace(/[%,()*]/g, "").slice(0, 60);
  let consulta = createAdminClient().from("profiles").select("id, nombre, apellidos, email, rol").neq("rol", "admin").order("nombre").limit(30);
  if (t) consulta = consulta.or(`nombre.ilike.%${t}%,apellidos.ilike.%${t}%,email.ilike.%${t}%`);
  const { data } = await consulta;
  const ROL: Record<string, string> = { alumno: "Alumno/a", invitado: "Invitado/a", exalumno: "Exalumno/a", coach: "Coach" };
  return ((data ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null; rol: string }[]).map((p) => ({
    id: p.id,
    nombre: [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)",
    detalle: ROL[p.rol] ?? p.rol,
  }));
}
