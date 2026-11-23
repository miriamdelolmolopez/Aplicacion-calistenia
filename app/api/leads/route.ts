import { NextResponse } from "next/server";
import { SERVICIOS_INTERES } from "@/lib/leads";
import { notificarApp } from "@/lib/notificaciones";
import { estadosDe } from "@/app/admin/leads/datos";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";

// Recibe un lead desde el formulario de la app (/contacto) o desde un formulario de otra web (landing).
//
// Variables (Vercel > Settings > Environment Variables), las dos opcionales:
//   LEADS_ORIGENES  webs que pueden enviar desde el navegador, separadas por comas
//                   (por ejemplo https://miriamdelolmo.com,https://www.miriamdelolmo.com)
//   LEADS_TOKEN     clave secreta para herramientas que envían desde su servidor (webhooks);
//                   se manda en la cabecera «x-leads-token» o en la dirección como ?token=…
// El formulario de la propia app (/contacto) no necesita ninguna de las dos.

const CORS_BASE = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, x-leads-token", "Access-Control-Max-Age": "86400", Vary: "Origin" };

function origenesPermitidos(): string[] {
  return (process.env.LEADS_ORIGENES ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function cabecerasCors(origen: string | null): Record<string, string> {
  if (origen && origenesPermitidos().includes(origen)) return { ...CORS_BASE, "Access-Control-Allow-Origin": origen };
  return CORS_BASE;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecerasCors(request.headers.get("origin")) });
}

// Los formularios de otras herramientas llaman a los campos de formas distintas.
function primero(d: Record<string, unknown>, claves: string[], max: number): string {
  for (const k of claves) {
    const v = d[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim().slice(0, max);
  }
  return "";
}

export async function POST(request: Request) {
  const origen = request.headers.get("origin");
  const cors = cabecerasCors(origen);
  const responder = (cuerpo: Record<string, unknown>, status = 200) => NextResponse.json(cuerpo, { status, headers: cors });

  // Quién envía: la propia app, una web autorizada, o una herramienta con la clave secreta.
  const url = new URL(request.url);
  const mismaWeb = origen === url.origin;
  const webAutorizada = !!origen && origenesPermitidos().includes(origen);
  const clave = process.env.LEADS_TOKEN;
  const conClave = !!clave && (request.headers.get("x-leads-token") === clave || url.searchParams.get("token") === clave);
  // Sin «Origin» (envío desde un servidor) solo se admite con la clave.
  if (!mismaWeb && !webAutorizada && !conClave) return responder({ ok: false, error: "no_autorizado" }, 403);

  let d: Record<string, unknown> = {};
  try {
    const tipo = request.headers.get("content-type") ?? "";
    if (tipo.includes("application/json")) d = await request.json();
    else d = Object.fromEntries((await request.formData()).entries());
  } catch {
    return responder({ ok: false, error: "formato" }, 400);
  }

  // Campo escondido que solo rellenan los robots: se responde «bien» sin guardar nada.
  if (primero(d, ["web", "website", "url"], 200) !== "") return responder({ ok: true });

  const nombre = primero(d, ["nombre", "name", "first_name"], 120);
  const email = primero(d, ["email", "correo", "e-mail", "mail"], 200).toLowerCase();
  const telefono = primero(d, ["telefono", "teléfono", "phone", "tel", "movil"], 40);
  const mensaje = primero(d, ["mensaje", "message", "comentarios", "notas"], 2000);
  const servicio = primero(d, ["servicio", "service", "interes"], 60);
  const acepta = ["true", "on", "1", "si", "sí", "yes"].includes(String(d.acepta ?? d.privacidad ?? "").toLowerCase());
  if (!nombre || !emailValido(email)) return responder({ ok: false, error: "datos" }, 400);
  if (!acepta) return responder({ ok: false, error: "privacidad" }, 400);

  const admin = createAdminClient();

  // El lead es de la primera administradora de la app.
  const { data: jefa } = await admin.from("profiles").select("id").eq("rol", "admin").order("creado_en", { ascending: true }).limit(1).maybeSingle();
  if (!jefa) return responder({ ok: false, error: "guardar" }, 500);
  const entrenadorId = jefa.id as string;

  // Freno básico contra abusos: máximo 3 envíos por correo en 24 horas.
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("entrenador_id", entrenadorId).ilike("email", email).gte("llegada_en", desde);
  if ((count ?? 0) >= 3) return responder({ ok: true });

  // Entra en el primer estado de su lista (la primera vez se crean los de por defecto).
  const estados = await estadosDe(entrenadorId);
  if (estados.length === 0) return responder({ ok: false, error: "guardar" }, 500);

  const textoServicio = SERVICIOS_INTERES.find((x) => x.clave === servicio)?.texto ?? "";
  const info: { clave: string; valor: string }[] = [];
  if (textoServicio) info.push({ clave: "Servicio", valor: textoServicio });
  if (mensaje) info.push({ clave: "Mensaje", valor: mensaje });

  const { data: nuevo, error } = await admin
    .from("leads")
    .insert({
      entrenador_id: entrenadorId,
      estado_id: estados[0].id,
      nombre,
      email,
      telefono,
      destino: "Formulario de la app",
      manual: false,
      info,
      llegada_en: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !nuevo) return responder({ ok: false, error: "guardar" }, 500);

  // Aviso a la administradora: campana de la app y notificación en el móvil.
  await notificarApp([entrenadorId], {
    tipo: "admin_lead",
    titulo: "Nuevo lead",
    cuerpo: `${nombre} · ${email}`,
    enlace: "/admin/leads",
    ref: nuevo.id as string,
  });

  return responder({ ok: true });
}
