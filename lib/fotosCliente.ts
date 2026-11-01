import { createClient } from "@/lib/supabase/client";

export type FotosApp = {
  portada: string | null;
  inicio: string | null;
  tipos: Record<string, string>; // nombre del tipo de clase → foto
};

// Igual que obtenerFotosApp, pero se pide directamente desde el navegador: las acciones del servidor se hacen
// de una en una, y esta lectura no necesita pasar por ahí (son fotos públicas).
export async function obtenerFotosAppCliente(): Promise<FotosApp> {
  const supabase = createClient();
  const [{ data: sueltas }, { data: tipos }] = await Promise.all([
    supabase.from("fotos_app").select("clave, url"),
    supabase.from("tipos_clase").select("nombre, foto_url").not("foto_url", "is", null),
  ]);
  // Con varias fotos en un mismo sitio, cada visita enseña una al azar.
  const por = (base: string) => {
    const urls = (sueltas ?? []).filter((f) => f.clave === base || f.clave.startsWith(`${base}:`)).map((f) => f.url as string);
    return urls.length > 0 ? urls[Math.floor(Math.random() * urls.length)] : null;
  };
  return {
    portada: por("portada"),
    inicio: por("inicio"),
    tipos: Object.fromEntries((tipos ?? []).map((t) => [t.nombre, t.foto_url as string])),
  };
}
