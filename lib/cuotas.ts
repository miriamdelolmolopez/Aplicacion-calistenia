import "server-only";
import { administradoras, enviable, personas, protegido, reclamar, soltar, type Persona } from "./avisos";
import { enviarCorreo } from "./email";
import { claveDia, sumarDias } from "./fechas";
import { notificarApp } from "./notificaciones";
import { correoAutomatico, soloFecha } from "./plantillas-email";
import { createAdminClient } from "./supabase/admin";

// Pagos a plazos: ajustes (margen tras el vencimiento y días de aviso antes) y avisos que lanza el cron diario.

export const MARGEN_POR_DEFECTO = 7;
export const AVISO_POR_DEFECTO = 3;

function entero(valor: string | undefined, porDefecto: number, max: number): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : porDefecto;
}

export async function ajustesCuotas(): Promise<{ margen: number; aviso: number }> {
  const { data } = await createAdminClient().from("ajustes").select("clave, valor").in("clave", ["cuotas_margen_dias", "cuotas_aviso_dias"]);
  const mapa = new Map((data ?? []).map((a) => [a.clave as string, a.valor as string]));
  return { margen: entero(mapa.get("cuotas_margen_dias"), MARGEN_POR_DEFECTO, 90), aviso: entero(mapa.get("cuotas_aviso_dias"), AVISO_POR_DEFECTO, 30) };
}

// Suma meses a una fecha AAAA-MM-DD manteniendo el día (si el mes es más corto, el último día de ese mes).
export function masMeses(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const destino = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(d, ultimo));
  return destino.toISOString().slice(0, 10);
}

type Cuota = {
  id: string;
  user_id: string;
  bono_id: string | null;
  importe_centimos: number;
  vence_en: string;
  cuota_n: number | null;
  cuotas_total: number | null;
  bonos: { tipos_bono: { nombre: string } | null } | null;
};

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const nombreDe = (p: Persona | undefined) => p?.nombre || p?.email || "(sin nombre)";
const etiquetaCuota = (c: Cuota) => (c.cuotas_total && c.cuotas_total > 1 ? `cuota ${c.cuota_n ?? 1} de ${c.cuotas_total}` : "pago");

// Lo llama el cron una vez al día: avisa al alumno/a antes y el día del vencimiento, avisa a la administradora y pausa lo que lleva demasiado atrasado.
export async function avisarCuotas(): Promise<{ alumnos: number; admin: number; pausadas: number }> {
  const resultado = { alumnos: 0, admin: 0, pausadas: 0 };
  await protegido("cuotas a plazos", async () => {
    const admin = createAdminClient();
    const { aviso } = await ajustesCuotas();
    const hoy = claveDia(new Date().toISOString());
    const limiteAviso = sumarDias(hoy, aviso);

    const { data } = await admin
      .from("pagos")
      .select("id, user_id, bono_id, importe_centimos, vence_en, cuota_n, cuotas_total, bonos(tipos_bono(nombre))")
      .eq("estado", "pendiente")
      .not("vence_en", "is", null)
      .lte("vence_en", limiteAviso)
      .order("vence_en");
    const cuotas = ((data ?? []) as unknown as Cuota[]).filter((c) => c.user_id);
    if (cuotas.length === 0) {
      await pausarVencidas(resultado);
      return;
    }
    const porPersona = new Map((await personas([...new Set(cuotas.map((c) => c.user_id))])).map((p) => [p.id, p]));

    // 1. Alumno/a: aviso antes del vencimiento (los días que hayas elegido) y otro el mismo día. Cada uno se manda una sola vez.
    for (const c of cuotas) {
      const p = porPersona.get(c.user_id);
      if (!p) continue;
      const hoyEsElDia = c.vence_en === hoy;
      if (c.vence_en < hoy) continue;
      const en = p.idioma === "en";
      const tarifa = c.bonos?.tipos_bono?.nombre ?? (en ? "Payment" : "Pago");
      const cuando = soloFecha(`${c.vence_en}T12:00:00Z`, p.idioma);
      const tipo = hoyEsElDia ? "cuota_vence" : "cuota_aviso";
      const titulo = hoyEsElDia ? (en ? "A payment is due today" : "Hoy vence un pago") : en ? "A payment is coming up" : "Se acerca un pago";
      const cuerpo = `${tarifa} · ${eur(c.importe_centimos)} · ${cuando}`;
      await notificarApp(p.id, { tipo: "cuota", titulo, cuerpo, enlace: "/pagos", ref: `${tipo}:${c.id}` });
      if (!enviable(p.email) || !p.avisos_bono) continue;
      if (!(await reclamar(tipo, c.id, p.id))) continue;
      const mensaje = en
        ? `Hi {nombre},\n\nThis is a reminder of your payment for ${tarifa}: ${eur(c.importe_centimos)}, due on ${cuando}.\n\nThank you!`
        : `Hola {nombre},\n\nTe recordamos tu pago de ${tarifa}: ${eur(c.importe_centimos)}, con vencimiento el ${cuando}.\n\n¡Gracias!`;
      const ok = await enviarCorreo(correoAutomatico({ para: p.email as string, idioma: p.idioma, asunto: titulo, mensaje, valores: { nombre: p.nombre ?? "" }, ruta: "/pagos" }));
      if (ok) resultado.alumnos++;
      else await soltar(tipo, c.id, p.id);
    }

    // 2. Administradora: una sola vez al día, lo que vence hoy o ya está atrasado.
    const vencidas = cuotas.filter((c) => c.vence_en <= hoy);
    if (vencidas.length > 0) {
      const admins = await administradoras("admin_avisa_caducan");
      const ref = `admin-cuotas:${hoy}`;
      const { data: previa } = await admin.from("notificaciones").select("id").eq("tipo", "admin_cuota").eq("ref", ref).limit(1);
      if (admins.length > 0 && (previa ?? []).length === 0) {
        const titulo = vencidas.length === 1 ? "Hay 1 pago a plazos por cobrar" : `Hay ${vencidas.length} pagos a plazos por cobrar`;
        const lineas = vencidas.map((c) => `• ${nombreDe(porPersona.get(c.user_id))} · ${etiquetaCuota(c)} · ${eur(c.importe_centimos)} · ${c.vence_en < hoy ? "atrasado desde" : "vence"} ${c.vence_en.split("-").reverse().join("/")}`);
        await notificarApp(admins.map((a) => a.id), { tipo: "admin_cuota", titulo, cuerpo: lineas.slice(0, 3).join(" · ").replace(/•\s/g, "").slice(0, 140), enlace: "/admin/bonos", ref });
        for (const ad of admins) {
          const ok = await enviarCorreo(correoAutomatico({ para: ad.email, idioma: "es", asunto: titulo, mensaje: `Estos pagos a plazos vencen hoy o están atrasados:\n\n${lineas.join("\n")}`, valores: {}, ruta: "/admin/bonos" }));
          if (ok) resultado.admin++;
        }
      }
    }

    await pausarVencidas(resultado);
  });
  return resultado;
}

// Pausa las tarifas con una cuota vencida pasado el margen y avisa a la persona y a la administradora.
async function pausarVencidas(resultado: { alumnos: number; admin: number; pausadas: number }) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pausar_bonos_con_cuota_vencida");
  if (error) {
    // Si todavía no se ha pegado el archivo 103 en Supabase, no pasa nada: simplemente no hay nada que pausar.
    console.warn("[cuotas] no se pudo pausar: %s", error.message);
    return;
  }
  const lista = (data ?? []) as { bono_id: string; user_id: string }[];
  if (lista.length === 0) return;
  resultado.pausadas = lista.length;
  const gente = new Map((await personas([...new Set(lista.map((l) => l.user_id))])).map((p) => [p.id, p]));
  for (const l of lista) {
    const p = gente.get(l.user_id);
    if (!p) continue;
    const en = p.idioma === "en";
    const titulo = en ? "Your pass is paused: a payment is overdue" : "Tu tarifa está en pausa: hay un pago atrasado";
    await notificarApp(p.id, { tipo: "cuota", titulo, cuerpo: en ? "Pay the pending instalment to use it again." : "Cuando se cobre el pago pendiente podrás volver a usarla.", enlace: "/pagos", ref: `cuota_pausa:${l.bono_id}` });
    if (enviable(p.email) && p.avisos_bono && (await reclamar("cuota_pausa", l.bono_id, p.id))) {
      const mensaje = en
        ? "Hi {nombre},\n\nYour pass has been paused because a payment is overdue. As soon as it is paid you will be able to use it again."
        : "Hola {nombre},\n\nTu tarifa se ha pausado porque hay un pago atrasado. En cuanto se cobre podrás volver a usarla.";
      await enviarCorreo(correoAutomatico({ para: p.email as string, idioma: p.idioma, asunto: titulo, mensaje, valores: { nombre: p.nombre ?? "" }, ruta: "/pagos" }));
    }
  }
  const admins = await administradoras("admin_avisa_caducan");
  if (admins.length > 0) {
    const nombres = lista.map((l) => nombreDe(gente.get(l.user_id))).join(", ");
    await notificarApp(admins.map((a) => a.id), { tipo: "admin_cuota", titulo: lista.length === 1 ? "Una tarifa se ha pausado por un pago atrasado" : `${lista.length} tarifas se han pausado por pagos atrasados`, cuerpo: nombres.slice(0, 140), enlace: "/admin/bonos", ref: `admin-pausa:${claveDia(new Date().toISOString())}` });
  }
}
