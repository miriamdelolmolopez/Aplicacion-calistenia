// Datos de la titular y utilidades de la aceptación de los textos legales.
// Los textos y sus versiones viven en la base de datos (tabla textos_legales) y se editan
// desde Administración → Textos legales.

// Solo se usa si no se pueden leer las versiones de la base de datos.
export const VERSION_RESPALDO = "2026-10-v2";

export const TITULAR = {
  nombre: "Miriam del Olmo López de la Isidra",
  nif: "04855355D",
  direccion: "Paseo Marítimo Rey de España 83, 2B, 29640 Fuengirola (Málaga), España",
  email: "miriamcalistenia@gmail.com",
  telefono: "+34 644 184 762",
};

type Aceptacion = { tipo: string; version: string };
export type Versiones = { privacidad: string; terminos: string };

type ClienteLector = {
  from: (tabla: string) => {
    select: (columnas: string) => {
      eq: (columna: string, valor: boolean) => PromiseLike<{ data: { documento: string; version: string }[] | null }>;
    };
  };
};

// Versión vigente de la política de privacidad y de los términos.
export async function versionesVigentes(supabase: unknown): Promise<Versiones> {
  const { data } = await (supabase as ClienteLector).from("textos_legales").select("documento, version").eq("vigente", true);
  const v = (doc: string) => data?.find((d) => d.documento === doc)?.version ?? VERSION_RESPALDO;
  return { privacidad: v("privacidad"), terminos: v("terminos") };
}

// ¿Ha aceptado la persona la versión vigente de la política de privacidad y de los términos?
export function aceptadoVigente(filas: Aceptacion[] | null | undefined, versiones: Versiones): boolean {
  const lista = filas ?? [];
  return (
    lista.some((f) => f.tipo === "privacidad" && f.version === versiones.privacidad) &&
    lista.some((f) => f.tipo === "terminos" && f.version === versiones.terminos)
  );
}
