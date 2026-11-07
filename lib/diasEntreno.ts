import "server-only";
import { claveDia } from "./fechas";
import { notificarApp } from "./notificaciones";
import { createAdminClient } from "./supabase/admin";

// «Hoy toca entrenamiento»: cada mañana avisa, dentro de la app y en el móvil, a quien tiene un plan online en marcha
// y ha elegido ese día de la semana para entrenar (y todavía no ha entrenado hoy). Devuelve a cuántas personas avisa.
export async function avisarDiaDeEntreno(): Promise<number> {
  const admin = createAdminClient();
  const hoy = claveDia(new Date().toISOString());
  const diaSemana = ((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7) + 1; // lunes = 1

  const { data: candidatas } = await admin.from("profiles").select("id, idioma, nombre, rol").contains("dias_entreno", [diaSemana]).in("rol", ["alumno", "invitado"]);
  const lista = (candidatas ?? []) as { id: string; idioma: string | null; nombre: string | null }[];
  if (lista.length === 0) return 0;
  const ids = lista.map((p) => p.id);

  // Plan online en marcha (también si ya no le quedan entrenos pero el plan sigue dentro de sus fechas).
  const { data: planes } = await admin
    .from("bonos")
    .select("user_id")
    .eq("servicio", "online")
    .in("estado", ["activo", "agotado"])
    .gt("caduca_en", new Date().toISOString())
    .in("user_id", ids);
  const conPlan = new Set(((planes ?? []) as { user_id: string }[]).map((b) => b.user_id));

  // Quien ya ha entrenado hoy no necesita el aviso.
  const { data: entrenos } = await admin.from("entrenos").select("user_id, empezado_en").in("user_id", ids).gte("empezado_en", new Date(Date.now() - 20 * 3600 * 1000).toISOString());
  const yaHoy = new Set(((entrenos ?? []) as { user_id: string; empezado_en: string }[]).filter((e) => claveDia(e.empezado_en) === hoy).map((e) => e.user_id));

  const destinatarias = lista.filter((p) => conPlan.has(p.id) && !yaHoy.has(p.id));
  let total = 0;
  for (const idioma of ["es", "en"] as const) {
    const grupo = destinatarias.filter((p) => (p.idioma === "en" ? "en" : "es") === idioma).map((p) => p.id);
    if (grupo.length === 0) continue;
    await notificarApp(grupo, {
      tipo: "entreno_dia",
      titulo: idioma === "en" ? "Hello! Today is a training day" : "¡Hola! Hoy toca entrenamiento",
      cuerpo: idioma === "en" ? "Open your routine and get started." : "Abre tu rutina y a por ello.",
      enlace: "/rutina",
      ref: `entreno_dia:${hoy}`,
    });
    total += grupo.length;
  }
  return total;
}
