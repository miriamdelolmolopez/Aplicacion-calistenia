import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Notificaciones dentro de la app (la campana) y en el móvil (push). Nunca lanzan errores:
// si algo falla, se anota en el registro del servidor y quien las pidió sigue adelante.
//
// Variables para las notificaciones del móvil (Vercel > Settings > Environment Variables):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY   clave pública
//   VAPID_PRIVATE_KEY              clave privada (secreta)
//   VAPID_SUBJECT                  opcional, por ejemplo mailto:hola@miriamdelolmo.com
// Sin ellas la campana funciona igual; solo falta el aviso en el móvil.

export type TipoNotificacion =
  | "reserva"
  | "cancelacion"
  | "recordatorio"
  | "bono"
  | "bono_clases"
  | "inactividad"
  | "cumpleanos"
  | "anuncio"
  | "mensaje"
  | "clase_cancelada"
  | "plaza_liberada"
  | "aniversario"
  | "admin_reserva"
  | "admin_cancelacion"
  | "admin_minimo"
  | "admin_regalos"
  | "admin_borrado"
  | "admin_tarea";

// Se avisan siempre, la persona no los puede desactivar.
const ESENCIALES = new Set<TipoNotificacion>(["clase_cancelada", "plaza_liberada", "aniversario"]);

export type Notificacion = { tipo: TipoNotificacion; titulo: string; cuerpo?: string | null; enlace?: string | null; ref?: string | null };

function configurarPush(): boolean {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:avisos@miriamdelolmo.com", publica, privada);
  return true;
}

// Crea la notificación para cada persona (respetando lo que haya desactivado) y la manda también al móvil.
export async function notificarApp(destinos: string | string[], n: Notificacion): Promise<void> {
  try {
    const ids = [...new Set(Array.isArray(destinos) ? destinos : [destinos])].filter(Boolean);
    if (ids.length === 0) return;
    const admin = createAdminClient();

    const { data: perfiles } = await admin.from("profiles").select("id, avisos_app").in("id", ids);
    let permitidos = (perfiles ?? [])
      .filter((p) => ESENCIALES.has(n.tipo) || (p.avisos_app as Record<string, boolean> | null)?.[n.tipo] !== false)
      .map((p) => p.id as string);
    if (permitidos.length === 0) return;

    // Si ya se avisó de lo mismo (misma referencia), no se repite.
    if (n.ref) {
      const { data: previas } = await admin.from("notificaciones").select("user_id").eq("tipo", n.tipo).eq("ref", n.ref).in("user_id", permitidos);
      const ya = new Set((previas ?? []).map((x) => x.user_id as string));
      permitidos = permitidos.filter((id) => !ya.has(id));
      if (permitidos.length === 0) return;
    }

    const { error } = await admin
      .from("notificaciones")
      .insert(permitidos.map((user_id) => ({ user_id, tipo: n.tipo, titulo: n.titulo, cuerpo: n.cuerpo ?? null, enlace: n.enlace ?? null, ref: n.ref ?? null })));
    if (error) {
      console.warn("[notificaciones] no se pudo guardar «%s»: %s", n.titulo, error.message);
      return;
    }

    if (!configurarPush()) return;
    const { data: subs } = await admin.from("push_suscripciones").select("id, endpoint, p256dh, auth").in("user_id", permitidos);
    const carga = JSON.stringify({ title: n.titulo, body: n.cuerpo ?? "", url: n.enlace ?? "/notificaciones" });
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, carga);
        } catch (e) {
          const estado = (e as { statusCode?: number }).statusCode;
          // El móvil ya no quiere avisos (se desinstaló la app o se quitó el permiso): se olvida.
          if (estado === 404 || estado === 410) await admin.from("push_suscripciones").delete().eq("id", s.id);
          else console.warn("[push] no se pudo enviar: %s", String(e));
        }
      }),
    );
  } catch (e) {
    console.warn("[notificaciones] %s", String(e));
  }
}
