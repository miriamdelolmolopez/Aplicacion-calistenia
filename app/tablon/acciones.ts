"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AnuncioFila = { id: string; titulo: string; texto: string; enlace: string | null; fijado: boolean; publicado_en: string };

// Los anuncios del tablón que puede ver la persona que llama: los vigentes de «todos» y, si tiene una tarifa en marcha, los de «activos».
export async function obtenerAnuncios(limite = 50): Promise<AnuncioFila[]> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const ahora = new Date().toISOString();

  const [{ data: perfil }, { count: conBono }] = await Promise.all([
    admin.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
    admin.from("bonos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("estado", "activo"),
  ]);
  if (!perfil) return [];
  const esActiva = perfil.rol === "admin" || (conBono ?? 0) > 0;

  const { data } = await admin
    .from("anuncios")
    .select("id, titulo, texto, enlace, fijado, publicado_en, audiencia, caduca_en")
    .or(`caduca_en.is.null,caduca_en.gt.${ahora}`)
    .order("fijado", { ascending: false })
    .order("publicado_en", { ascending: false })
    .limit(200);
  return ((data ?? []) as (AnuncioFila & { audiencia: string })[])
    .filter((a) => a.audiencia === "todos" || esActiva)
    .slice(0, limite)
    .map(({ id, titulo, texto, enlace, fijado, publicado_en }) => ({ id, titulo, texto, enlace, fijado, publicado_en }));
}
