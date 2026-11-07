"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { enviable, personas, protegido } from "@/lib/avisos";
import { enviarCorreo } from "@/lib/email";
import { notificarApp } from "@/lib/notificaciones";
import { correoAnuncio } from "@/lib/plantillas-email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

// Publica un anuncio en el tablón y, si se pide, avisa por la app y/o por correo a quien lo puede ver.
export async function publicarAnuncio(_previo: Estado, formData: FormData): Promise<Estado> {
  const { user } = await requireAdmin("contenido");
  const titulo = String(formData.get("titulo") ?? "").trim().slice(0, 120);
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  let enlace = String(formData.get("enlace") ?? "").trim().slice(0, 300);
  const audiencia = String(formData.get("audiencia") ?? "activos") === "todos" ? "todos" : "activos";
  const fijado = formData.get("fijado") === "on";
  const avisarApp = formData.get("avisar_app") === "on";
  const avisarCorreo = formData.get("avisar_correo") === "on";
  const caduca = String(formData.get("caduca") ?? "").trim();
  const admite = formData.get("admite_apuntados") === "on";
  const maxPlazas = Number(String(formData.get("max_plazas") ?? "").trim());

  if (!titulo || !texto) return { error: "Escribe el título y el texto del anuncio." };
  if (enlace && !/^(https?:\/\/|\/(?!\/))/i.test(enlace)) return { error: "El enlace tiene que empezar por https:// (o por / si es una página de la app)." };
  if (!enlace) enlace = "";
  if (caduca && !/^\d{4}-\d{2}-\d{2}$/.test(caduca)) return { error: "La fecha en la que desaparece no es válida." };

  const admin = createAdminClient();
  const { data: nuevo, error } = await admin
    .from("anuncios")
    .insert({
      titulo,
      texto,
      enlace: enlace || null,
      audiencia,
      fijado,
      caduca_en: caduca ? new Date(`${caduca}T23:59:59+01:00`).toISOString() : null,
      avisar_app: avisarApp,
      avisar_correo: avisarCorreo,
      creado_por: user.id,
      ...(admite ? { admite_apuntados: true, max_plazas: Number.isInteger(maxPlazas) && maxPlazas > 0 ? maxPlazas : null } : {}),
    })
    .select("id")
    .single();
  if (error || !nuevo) return { error: admite ? "No se ha podido publicar con la opción de apuntarse. Puede que falte ejecutar el SQL 089 en Supabase." : "No se ha podido publicar. Inténtalo de nuevo." };

  // A quién le llega: alumnos con tarifa en marcha («activos») o todas las personas con cuenta que no son administradoras («todos»).
  let destinatarios: string[] = [];
  if (avisarApp || avisarCorreo) {
    const { data: cuentas } = await admin.from("profiles").select("id, rol").in("rol", ["alumno", "invitado"]);
    const todas = (cuentas ?? []).map((c) => c.id as string);
    if (audiencia === "todos") destinatarios = todas;
    else {
      const { data: conBono } = await admin.from("bonos").select("user_id").in("estado", ["activo", "agotado"]).or(`estado.eq.activo,caduca_en.gt.${new Date().toISOString()}`).in("user_id", todas.length ? todas : ["00000000-0000-0000-0000-000000000000"]);
      destinatarios = [...new Set((conBono ?? []).map((b) => b.user_id as string))];
    }
  }

  if (avisarApp && destinatarios.length > 0) {
    await notificarApp(destinatarios, { tipo: "anuncio", titulo, cuerpo: texto.slice(0, 140), enlace: "/tablon", ref: nuevo.id as string });
  }
  if (avisarCorreo && destinatarios.length > 0) {
    await protegido("anuncio", async () => {
      for (const p of await personas(destinatarios)) {
        if (!enviable(p.email) || p.avisos_novedades === false) continue;
        await enviarCorreo(correoAnuncio({ para: p.email, idioma: p.idioma, titulo, texto, enlace: enlace || null }));
      }
    });
  }

  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
  const cuantos = destinatarios.length;
  return { mensaje: `Anuncio publicado.${avisarApp ? ` Aviso en la app a ${cuantos} ${cuantos === 1 ? "persona" : "personas"}.` : ""}${avisarCorreo ? " Correos enviados." : ""}` };
}

export async function quitarAnuncio(id: string): Promise<{ ok: boolean }> {
  await requireAdmin("contenido");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await createAdminClient().from("anuncios").delete().eq("id", id);
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
  return { ok: true };
}

export async function fijarAnuncio(id: string, fijado: boolean): Promise<{ ok: boolean }> {
  await requireAdmin("contenido");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await createAdminClient().from("anuncios").update({ fijado }).eq("id", id);
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
  return { ok: true };
}

// Cambia un anuncio ya publicado (no vuelve a avisar a nadie).
export async function editarAnuncio(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin("contenido");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "No se ha podido identificar el anuncio." };
  const titulo = String(formData.get("titulo") ?? "").trim().slice(0, 120);
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  const enlace = String(formData.get("enlace") ?? "").trim().slice(0, 300);
  const audiencia = String(formData.get("audiencia") ?? "activos") === "todos" ? "todos" : "activos";
  const fijado = formData.get("fijado") === "on";
  const caduca = String(formData.get("caduca") ?? "").trim();
  const conOpcion = formData.get("opcion_apuntados") === "1"; // el formulario trae la opción de apuntarse (ya existe en la base de datos)
  const admite = formData.get("admite_apuntados") === "on";
  const maxPlazas = Number(String(formData.get("max_plazas") ?? "").trim());
  if (!titulo || !texto) return { error: "Escribe el título y el texto del anuncio." };
  if (enlace && !/^(https?:\/\/|\/(?!\/))/i.test(enlace)) return { error: "El enlace tiene que empezar por https:// (o por / si es una página de la app)." };
  if (caduca && !/^\d{4}-\d{2}-\d{2}$/.test(caduca)) return { error: "La fecha en la que desaparece no es válida." };

  const { error } = await createAdminClient()
    .from("anuncios")
    .update({
      titulo,
      texto,
      enlace: enlace || null,
      audiencia,
      fijado,
      caduca_en: caduca ? new Date(`${caduca}T23:59:59+01:00`).toISOString() : null,
      ...(conOpcion ? { admite_apuntados: admite, max_plazas: admite && Number.isInteger(maxPlazas) && maxPlazas > 0 ? maxPlazas : null } : {}),
    })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
  revalidatePath("/inicio");
  return { mensaje: "Anuncio guardado." };
}

// Quién ha contestado a un anuncio, con el nombre completo (solo lo ve la administradora).
export type RespuestaAnuncio = { userId: string; nombre: string; respuesta: "voy" | "no_puedo" | "pensar"; cuando: string };

export async function quitarRespuesta(anuncioId: string, userId: string): Promise<{ ok: boolean }> {
  await requireAdmin("contenido");
  if (!/^[0-9a-f-]{36}$/i.test(anuncioId) || !/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false };
  const { error } = await createAdminClient().from("anuncio_respuestas").delete().eq("anuncio_id", anuncioId).eq("user_id", userId);
  revalidatePath("/admin/tablon");
  revalidatePath("/tablon");
  return { ok: !error };
}
