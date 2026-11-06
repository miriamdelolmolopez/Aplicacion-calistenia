import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CumpleProximo } from "./cumpleanosTexto";


// Cumpleaños de hoy y de los próximos días (solo de quien lo tiene activado en Ajustes).
// Los días de antelación los elige la administradora (ajuste «cumple_aviso_dias»; 0 = solo el mismo día).
export async function cumpleanosProximos(): Promise<{ lista: CumpleProximo[]; antelacion: number }> {
  const admin = createAdminClient();
  const { data: ajuste } = await admin.from("ajustes").select("valor").eq("clave", "cumple_aviso_dias").maybeSingle();
  const antelacion = Math.min(60, Math.max(0, Math.floor(Number(ajuste?.valor ?? 0)) || 0));
  const { data: nacidos } = await admin
    .from("profiles")
    .select("id, nombre, apellidos, fecha_nacimiento")
    .eq("rol", "alumno")
    .eq("avisar_cumple", true)
    .not("fecha_nacimiento", "is", null);

  const hoyMadrid = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const [hy, hm, hd] = hoyMadrid.split("-").map(Number);
  const diaInicio = Date.UTC(hy, hm - 1, hd);
  const lista = ((nacidos ?? []) as { id: string; nombre: string | null; apellidos: string | null; fecha_nacimiento: string }[])
    .map((n) => {
      const [, m, d] = n.fecha_nacimiento.split("-").map(Number);
      let prox = Date.UTC(hy, m - 1, d);
      // El 29 de febrero se celebra el 28 en los años que no son bisiestos.
      if (m === 2 && d === 29 && new Date(Date.UTC(hy, 1, 29)).getUTCMonth() !== 1) prox = Date.UTC(hy, 1, 28);
      if (prox < diaInicio) prox = Date.UTC(hy + 1, m - 1, d);
      const fecha = new Date(prox);
      return {
        id: n.id,
        nombre: [n.nombre, n.apellidos].filter(Boolean).join(" ") || "Sin nombre",
        faltan: Math.round((prox - diaInicio) / 86_400_000),
        dia: fecha.getUTCDate(),
        mes: fecha.getUTCMonth() + 1,
      };
    })
    .filter((c) => c.faltan <= antelacion)
    .sort((a, b) => a.faltan - b.faltan || a.nombre.localeCompare(b.nombre, "es"));
  return { lista, antelacion };
}

