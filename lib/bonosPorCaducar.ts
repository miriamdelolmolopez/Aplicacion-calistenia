import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const ZONA = "Europe/Madrid";
const DIAS_POR_DEFECTO = 7;

export type BonoPorCaducar = { userId: string; nombre: string; tarifa: string; servicio: string; caduca_en: string; faltan: number; cuando: string };

// Con cuántos días de antelación se avisa de que a alguien se le acaba la tarifa o el bono (lo elige la administradora).
export async function diasAvisoBonos(): Promise<number> {
  const { data } = await createAdminClient().from("ajustes").select("valor").eq("clave", "bonos_aviso_dias").maybeSingle();
  const n = Math.floor(Number(data?.valor ?? DIAS_POR_DEFECTO));
  return Number.isFinite(n) && n >= 1 ? Math.min(60, n) : DIAS_POR_DEFECTO;
}

const diaMadrid = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// Tarifas y bonos que caducan en los próximos `dias` días. No salen los que ya se han renovado (tiene otro del mismo servicio que dura más o que empieza después).
export async function bonosPorCaducar(dias: number): Promise<BonoPorCaducar[]> {
  const admin = createAdminClient();
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + dias * 24 * 3600 * 1000);
  const { data } = await admin
    .from("bonos")
    .select("id, user_id, servicio, estado, caduca_en, tipos_bono(nombre)")
    .in("estado", ["activo", "agotado"])
    .gt("caduca_en", ahora.toISOString())
    .lte("caduca_en", limite.toISOString());
  const candidatos = (data ?? []) as unknown as { id: string; user_id: string; servicio: string; estado: string; caduca_en: string; tipos_bono: { nombre: string } | null }[];
  if (candidatos.length === 0) return [];

  const ids = [...new Set(candidatos.map((b) => b.user_id))];
  const [{ data: todos }, { data: personas }] = await Promise.all([
    admin.from("bonos").select("id, user_id, servicio, estado, caduca_en").in("user_id", ids).in("estado", ["activo", "agotado", "en_cola"]),
    admin.from("profiles").select("id, nombre, apellidos, email").in("id", ids),
  ]);
  const otros = (todos ?? []) as { id: string; user_id: string; servicio: string; estado: string; caduca_en: string | null }[];
  const nombre = new Map(((personas ?? []) as { id: string; nombre: string | null; apellidos: string | null; email: string | null }[]).map((p) => [p.id, [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "Sin nombre"]));

  const hoy = diaMadrid(ahora);
  const mañana = diaMadrid(new Date(ahora.getTime() + 24 * 3600 * 1000));
  return candidatos
    .filter(
      (b) =>
        !otros.some(
          (x) =>
            x.id !== b.id &&
            x.user_id === b.user_id &&
            x.servicio === b.servicio &&
            (x.estado === "en_cola" || (!!x.caduca_en && new Date(x.caduca_en) > new Date(b.caduca_en) && (x.estado === "activo" || new Date(x.caduca_en) > ahora))),
        ),
    )
    .sort((a, b) => a.caduca_en.localeCompare(b.caduca_en))
    .map((b) => {
      const fin = new Date(b.caduca_en);
      const dia = diaMadrid(fin);
      const faltan = Math.round((new Date(`${dia}T12:00:00Z`).getTime() - new Date(`${hoy}T12:00:00Z`).getTime()) / 86_400_000);
      const fecha = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "numeric", month: "short" }).format(fin);
      const cuando = dia === hoy ? "hoy" : dia === mañana ? "mañana" : `en ${faltan} días (${fecha})`;
      return { userId: b.user_id, nombre: nombre.get(b.user_id) ?? "Sin nombre", tarifa: b.tipos_bono?.nombre ?? "", servicio: b.servicio, caduca_en: b.caduca_en, faltan, cuando };
    });
}
