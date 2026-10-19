"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

function repasar() {
  for (const ruta of ["/admin/aprende", "/admin/aprende/glosario", "/admin/aprende/historia", "/admin/aprende/preguntas"]) revalidatePath(ruta);
}

// ---- Glosario ----
export async function guardarTermino(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  const terminoEs = texto(formData, "termino_es");
  const terminoEn = texto(formData, "termino_en");
  const definicionEs = texto(formData, "definicion_es");
  const definicionEn = texto(formData, "definicion_en");

  if (id && !UUID.test(id)) return { error: "Término no válido." };
  if (terminoEs.length < 1 || terminoEs.length > 60) return { error: "El término debe tener entre 1 y 60 letras." };
  if (terminoEn.length > 60) return { error: "El término en inglés puede tener hasta 60 letras." };
  if (definicionEs.length < 3 || definicionEs.length > 800) return { error: "La definición debe tener entre 3 y 800 letras." };
  if (definicionEn.length > 800) return { error: "La definición en inglés puede tener hasta 800 letras." };

  const campos = {
    termino_es: terminoEs,
    termino_en: terminoEn || null,
    definicion_es: definicionEs,
    definicion_en: definicionEn || null,
    activo: formData.get("activo") === "on",
  };
  const admin = createAdminClient();
  const { error } = id ? await admin.from("glosario").update(campos).eq("id", id) : await admin.from("glosario").insert(campos);
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  repasar();
  return { mensaje: id ? "Cambios guardados." : "Término añadido." };
}

// ---- Historia ----
export async function guardarSeccion(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  const tituloEs = texto(formData, "titulo_es");
  const tituloEn = texto(formData, "titulo_en");
  const textoEs = texto(formData, "texto_es");
  const textoEn = texto(formData, "texto_en");
  const orden = Number(texto(formData, "orden") || "0");

  if (id && !UUID.test(id)) return { error: "Apartado no válido." };
  if (tituloEs.length < 2 || tituloEs.length > 80) return { error: "El título debe tener entre 2 y 80 letras." };
  if (tituloEn.length > 80) return { error: "El título en inglés puede tener hasta 80 letras." };
  if (textoEs.length < 3 || textoEs.length > 5000) return { error: "El texto debe tener entre 3 y 5000 letras." };
  if (textoEn.length > 5000) return { error: "El texto en inglés puede tener hasta 5000 letras." };
  if (!Number.isInteger(orden) || orden < 0 || orden > 999) return { error: "El orden es un número entero (0 a 999)." };

  const campos = {
    titulo_es: tituloEs,
    titulo_en: tituloEn || null,
    texto_es: textoEs,
    texto_en: textoEn || null,
    orden,
    activo: formData.get("activo") === "on",
  };
  const admin = createAdminClient();
  const { error } = id ? await admin.from("historia").update(campos).eq("id", id) : await admin.from("historia").insert(campos);
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  repasar();
  return { mensaje: id ? "Cambios guardados." : "Apartado añadido." };
}

// ---- Preguntas del examen ----
export async function guardarPregunta(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();
  const id = texto(formData, "id");
  const preguntaEs = texto(formData, "pregunta_es");
  const preguntaEn = texto(formData, "pregunta_en");
  const opcionesEs = [1, 2, 3, 4].map((n) => texto(formData, `opcion_es_${n}`));
  const opcionesEn = [1, 2, 3, 4].map((n) => texto(formData, `opcion_en_${n}`));
  const correcta = Number(texto(formData, "correcta"));
  const explicacionEs = texto(formData, "explicacion_es");
  const explicacionEn = texto(formData, "explicacion_en");

  if (id && !UUID.test(id)) return { error: "Pregunta no válida." };
  if (preguntaEs.length < 5 || preguntaEs.length > 300) return { error: "La pregunta debe tener entre 5 y 300 letras." };
  if (preguntaEn.length > 300) return { error: "La pregunta en inglés puede tener hasta 300 letras." };
  if (opcionesEs.some((o) => o.length < 1 || o.length > 200)) return { error: "Escribe las 4 respuestas (hasta 200 letras cada una)." };
  if (new Set(opcionesEs.map((o) => o.toLowerCase())).size !== 4) return { error: "Las 4 respuestas tienen que ser distintas." };
  const algunaEn = opcionesEn.some((o) => o);
  if (algunaEn && opcionesEn.some((o) => o.length < 1 || o.length > 200)) return { error: "Si pones respuestas en inglés, tienen que ser las 4." };
  if (!Number.isInteger(correcta) || correcta < 0 || correcta > 3) return { error: "Marca cuál es la respuesta correcta." };
  if (explicacionEs.length > 500 || explicacionEn.length > 500) return { error: "Las explicaciones pueden tener hasta 500 letras." };

  const campos = {
    pregunta_es: preguntaEs,
    pregunta_en: preguntaEn || null,
    opciones_es: opcionesEs,
    opciones_en: algunaEn ? opcionesEn : null,
    correcta,
    explicacion_es: explicacionEs || null,
    explicacion_en: explicacionEn || null,
    activa: formData.get("activa") === "on",
  };
  const admin = createAdminClient();
  const { error } = id ? await admin.from("preguntas").update(campos).eq("id", id) : await admin.from("preguntas").insert(campos);
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  repasar();
  return { mensaje: id ? "Cambios guardados." : "Pregunta añadida." };
}

// ---- Borrar ----
const TABLAS = { glosario: "glosario", historia: "historia", preguntas: "preguntas" } as const;

export async function borrarContenido(tabla: keyof typeof TABLAS, id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!(tabla in TABLAS) || !UUID.test(id)) return { ok: false, error: "No válido." };
  const { error } = await createAdminClient().from(TABLAS[tabla]).delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar." };
  repasar();
  return { ok: true };
}
