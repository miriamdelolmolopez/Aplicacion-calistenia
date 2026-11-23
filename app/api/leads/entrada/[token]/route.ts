import { NextResponse } from "next/server";
import { catalogosDe, estadosDe } from "@/app/admin/leads/datos";
import { camposDe, huella, leadDe, LIMITE_POR_MINUTO, MAX_BYTES, sinTildes } from "@/lib/leadsEntrada";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailValido } from "@/lib/validaciones";

// Aquí llegan los leads de los formularios externos (Tally, formularios web propios, Zapier…).
// La dirección lleva una clave secreta: cada clave solo crea leads para su entrenador.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const responder = (cuerpo: Record<string, unknown>, status = 200) => NextResponse.json(cuerpo, { status, headers: CORS });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 100) return responder({ ok: false, error: "Dirección no válida." }, 404);

  const admin = createAdminClient();
  const { data: conexion } = await admin.from("leads_conexiones").select("id, entrenador_id, nombre, activo, recibidos").eq("token_hash", huella(token)).maybeSingle();
  if (!conexion || !conexion.activo) return responder({ ok: false, error: "Dirección no válida o desactivada." }, 404);

  // Límite de leads por minuto en esta conexión (por si alguien intenta llenarla de basura).
  const hace1min = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from("leads").select("id", { count: "exact", head: true }).eq("conexion_id", conexion.id).gte("llegada_en", hace1min);
  if ((count ?? 0) >= LIMITE_POR_MINUTO) return responder({ ok: false, error: "Demasiados envíos seguidos. Inténtalo en un minuto." }, 429);

  // Se lee lo que llega: un JSON (Tally, Zapier…) o un formulario web normal.
  const texto = await request.text();
  if (texto.length > MAX_BYTES) return responder({ ok: false, error: "El envío es demasiado grande." }, 413);
  const tipoContenido = request.headers.get("content-type") ?? "";
  let cuerpo: unknown = {};
  try {
    if (tipoContenido.includes("application/json")) cuerpo = JSON.parse(texto);
    else cuerpo = Object.fromEntries(new URLSearchParams(texto));
  } catch {
    return responder({ ok: false, error: "No se han podido leer los datos." }, 400);
  }

  const campos = camposDe(cuerpo);
  const redirigir = campos.find((c) => c.clave === "_redirect")?.valor ?? "";
  const lead = leadDe(campos.filter((c) => c.clave !== "_redirect"));
  const terminar = () => {
    if (/^https?:\/\//i.test(redirigir) && !tipoContenido.includes("application/json")) return NextResponse.redirect(redirigir, { status: 303, headers: CORS });
    return responder({ ok: true });
  };
  if (lead.spam) return terminar(); // un robot rellenó el campo oculto: se ignora sin avisar
  if (!emailValido(lead.email)) return responder({ ok: false, error: "Falta un correo válido." }, 422);
  if (!lead.nombre) lead.nombre = lead.email.split("@")[0].slice(0, 80);

  const entrenadorId = conexion.entrenador_id as string;
  const { data: existente } = await admin.from("leads").select("id, info, estado_id, leads_estados(nombre)").eq("entrenador_id", entrenadorId).ilike("email", lead.email).limit(1).maybeSingle();

  if (existente) {
    // Ya era un lead suyo: no se duplica. Se añade lo nuevo a su información y se deja una nota.
    const previa = (Array.isArray(existente.info) ? existente.info : []) as { clave: string; valor: string }[];
    const nuevas = lead.info.filter((n) => !previa.some((p) => p.clave === n.clave && p.valor === n.valor));
    await admin.from("leads").update({ info: [...previa, ...nuevas].slice(0, 80), actualizado_en: new Date().toISOString() }).eq("id", existente.id);
    const estado = (existente.leads_estados as unknown as { nombre: string } | null)?.nombre ?? "";
    await admin.from("leads_notas").insert({ lead_id: existente.id, entrenador_id: entrenadorId, texto: `Volvió a rellenar el formulario «${conexion.nombre}».`, estado_nombre: estado, autor: "Formulario" });
  } else {
    const estados = await estadosDe(entrenadorId);
    if (estados.length === 0) return responder({ ok: false, error: "No se ha podido crear el lead." }, 500);
    // Su tipo y sus etiquetas se buscan por nombre en las listas del entrenador (las etiquetas que no existan se crean en gris).
    const { etiquetas, tipos } = await catalogosDe(entrenadorId);
    const tipoId = lead.tipo ? (tipos.find((t) => sinTildes(t.nombre) === sinTildes(lead.tipo))?.id ?? null) : null;
    const etiquetaIds: string[] = [];
    let total = etiquetas.length;
    for (const nombre of lead.etiquetas) {
      const existente = etiquetas.find((e) => sinTildes(e.nombre) === sinTildes(nombre));
      if (existente) {
        etiquetaIds.push(existente.id);
      } else if (total < 40) {
        const { data: nueva } = await admin.from("leads_etiquetas").insert({ entrenador_id: entrenadorId, nombre, color: "gris", orden: total }).select("id").maybeSingle();
        if (nueva) {
          etiquetaIds.push(nueva.id as string);
          total += 1;
        }
      }
    }
    const { error } = await admin.from("leads").insert({
      entrenador_id: entrenadorId,
      estado_id: estados[0].id,
      nombre: lead.nombre,
      apellidos: lead.apellidos,
      telefono: lead.telefono,
      email: lead.email,
      pais: lead.pais,
      idioma: lead.idioma,
      tipo_id: tipoId,
      etiqueta_ids: etiquetaIds,
      info: lead.info,
      destino: conexion.nombre,
      manual: false,
      conexion_id: conexion.id,
    });
    if (error) return responder({ ok: false, error: "No se ha podido crear el lead." }, 500);
  }

  await admin
    .from("leads_conexiones")
    .update({ recibidos: (conexion.recibidos as number) + 1, ultimo_uso: new Date().toISOString() })
    .eq("id", conexion.id);
  return terminar();
}
