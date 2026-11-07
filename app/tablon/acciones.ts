"use server";

import { revalidatePath } from "next/cache";
import { comoVisto, enSoloLectura } from "@/lib/como";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Respuesta = "voy" | "no_puedo" | "pensar";

export type AnuncioFila = {
  id: string;
  titulo: string;
  texto: string;
  enlace: string | null;
  fijado: boolean;
  publicado_en: string;
  admiteApuntados: boolean;
  maxPlazas: number | null;
  miRespuesta: Respuesta | null;
  voy: number; // cuántas personas han dicho «me apunto»
  iniciales: string[]; // la inicial de cada una (para las pegatinas)
};

type FilaAnuncio = { id: string; titulo: string; texto: string; enlace: string | null; fijado: boolean; publicado_en: string; audiencia: string; caduca_en: string | null; admite_apuntados?: boolean; max_plazas?: number | null };

// ¿Tiene esta persona una tarifa en marcha? (también cuenta la que ya ha gastado sus clases pero sigue dentro de fechas)
async function esActiva(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const ahora = new Date().toISOString();
  const [{ data: perfil }, { count: conBono }] = await Promise.all([
    admin.from("profiles").select("rol").eq("id", userId).maybeSingle(),
    admin.from("bonos").select("id", { count: "exact", head: true }).eq("user_id", userId).in("estado", ["activo", "agotado"]).or(`estado.eq.activo,caduca_en.gt.${ahora}`),
  ]);
  return !!perfil && (perfil.rol === "admin" || (conBono ?? 0) > 0);
}

// Los anuncios del tablón que puede ver la persona que llama: los vigentes de «todos» y, si tiene una tarifa en marcha, los de «activos».
export async function obtenerAnuncios(limite = 50): Promise<AnuncioFila[]> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return [];
  const quien = (await comoVisto()) ?? user.id; // «Ver como alumno/a»: los anuncios que vería esa persona
  const admin = createAdminClient();
  const ahora = new Date().toISOString();

  const [{ data: perfil }, activa] = await Promise.all([admin.from("profiles").select("rol").eq("id", quien).maybeSingle(), esActiva(quien)]);
  if (!perfil) return [];
  const verTodo = perfil.rol === "admin" && quien === user.id;

  // Si todavía no existen las columnas de «apuntarse» se piden sin ellas.
  let datos: FilaAnuncio[] = [];
  const consulta = (columnas: string) =>
    admin.from("anuncios").select(columnas).or(`caduca_en.is.null,caduca_en.gt.${ahora}`).order("fijado", { ascending: false }).order("publicado_en", { ascending: false }).limit(200);
  const primera = await consulta("id, titulo, texto, enlace, fijado, publicado_en, audiencia, caduca_en, admite_apuntados, max_plazas");
  if (primera.error) datos = ((await consulta("id, titulo, texto, enlace, fijado, publicado_en, audiencia, caduca_en")).data ?? []) as unknown as FilaAnuncio[];
  else datos = (primera.data ?? []) as unknown as FilaAnuncio[];

  const visibles = datos.filter((a) => a.audiencia === "todos" || activa || verTodo).slice(0, limite);

  // Respuestas («me apunto», «no puedo ir», «necesito pensarlo»).
  const conApuntados = visibles.filter((a) => a.admite_apuntados).map((a) => a.id);
  const respuestas = new Map<string, { user_id: string; respuesta: Respuesta }[]>();
  const nombres = new Map<string, string>();
  if (conApuntados.length > 0) {
    const { data } = await admin.from("anuncio_respuestas").select("anuncio_id, user_id, respuesta").in("anuncio_id", conApuntados);
    for (const r of (data ?? []) as { anuncio_id: string; user_id: string; respuesta: Respuesta }[]) {
      respuestas.set(r.anuncio_id, [...(respuestas.get(r.anuncio_id) ?? []), { user_id: r.user_id, respuesta: r.respuesta }]);
    }
    const ids = [...new Set([...respuestas.values()].flat().filter((r) => r.respuesta === "voy").map((r) => r.user_id))];
    if (ids.length > 0) {
      const { data: ps } = await admin.from("profiles").select("id, nombre").in("id", ids);
      for (const p of (ps ?? []) as { id: string; nombre: string | null }[]) nombres.set(p.id, (p.nombre ?? "").trim());
    }
  }

  return visibles.map((a) => {
    const rs = respuestas.get(a.id) ?? [];
    const quienesVan = rs.filter((r) => r.respuesta === "voy");
    return {
      id: a.id,
      titulo: a.titulo,
      texto: a.texto,
      enlace: a.enlace,
      fijado: a.fijado,
      publicado_en: a.publicado_en,
      admiteApuntados: !!a.admite_apuntados,
      maxPlazas: a.max_plazas ?? null,
      miRespuesta: rs.find((r) => r.user_id === quien)?.respuesta ?? null,
      voy: quienesVan.length,
      iniciales: quienesVan.map((r) => (nombres.get(r.user_id) || "?").charAt(0).toUpperCase()),
    };
  });
}

// «Me apunto», «No puedo ir» o «Necesito pensarlo» (null quita la respuesta). Si hay máximo de plazas, no se puede pasar de ahí.
export async function responderAnuncio(anuncioId: string, respuesta: Respuesta | null): Promise<{ ok: boolean; error?: string }> {
  if (await enSoloLectura()) return { ok: false, error: "solo_lectura" };
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return { ok: false, error: "sesion" };
  if (!/^[0-9a-f-]{36}$/i.test(anuncioId)) return { ok: false, error: "anuncio" };
  if (respuesta !== null && !["voy", "no_puedo", "pensar"].includes(respuesta)) return { ok: false, error: "anuncio" };

  const admin = createAdminClient();
  const { data: a } = await admin.from("anuncios").select("id, audiencia, caduca_en, admite_apuntados, max_plazas").eq("id", anuncioId).maybeSingle();
  if (!a || !a.admite_apuntados || (a.caduca_en && new Date(a.caduca_en).getTime() < Date.now())) return { ok: false, error: "anuncio" };
  if (a.audiencia === "activos" && !(await esActiva(user.id))) return { ok: false, error: "anuncio" };

  if (respuesta === null) {
    await admin.from("anuncio_respuestas").delete().eq("anuncio_id", anuncioId).eq("user_id", user.id);
  } else {
    if (respuesta === "voy" && a.max_plazas) {
      const { count } = await admin.from("anuncio_respuestas").select("user_id", { count: "exact", head: true }).eq("anuncio_id", anuncioId).eq("respuesta", "voy").neq("user_id", user.id);
      if ((count ?? 0) >= a.max_plazas) return { ok: false, error: "completo" };
    }
    const { error } = await admin
      .from("anuncio_respuestas")
      .upsert({ anuncio_id: anuncioId, user_id: user.id, respuesta, actualizada_en: new Date().toISOString() }, { onConflict: "anuncio_id,user_id" });
    if (error) return { ok: false, error: "guardar" };
  }
  revalidatePath("/tablon");
  revalidatePath("/inicio");
  revalidatePath("/admin/tablon");
  return { ok: true };
}
