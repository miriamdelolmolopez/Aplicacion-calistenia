"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { NIVELES } from "@/lib/cursos";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

function numero(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// Crea un curso (sin id) o cambia uno que ya existe (con id).
export async function guardarCurso(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const titulo = texto(formData, "titulo");
  const tituloEn = texto(formData, "titulo_en");
  const descripcion = texto(formData, "descripcion");
  const descripcionEn = texto(formData, "descripcion_en");
  const categoria = texto(formData, "categoria");
  const nivel = texto(formData, "nivel");
  const estado = texto(formData, "estado");
  const enlace = texto(formData, "enlace");
  const fecha = texto(formData, "fecha_prevista");

  if (id && !UUID.test(id)) return { error: "Curso no válido." };
  if (titulo.length < 2 || titulo.length > 80) return { error: "El título debe tener entre 2 y 80 letras." };
  if (tituloEn.length > 80) return { error: "El título en inglés puede tener hasta 80 letras." };
  if (descripcion.length > 2000 || descripcionEn.length > 2000) return { error: "Las descripciones pueden tener hasta 2000 letras." };
  if (categoria.length > 40) return { error: "La categoría puede tener hasta 40 letras." };
  if (!NIVELES.some((n) => n.valor === nivel)) return { error: "Elige el nivel." };
  if (!["activo", "proximo", "oculto"].includes(estado)) return { error: "Elige si el curso es activo, próximo u oculto." };
  if (enlace && !/^https:\/\/\S+$/i.test(enlace)) return { error: "El enlace tiene que empezar por https://" };
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "La fecha prevista no es válida." };

  const precio = numero(texto(formData, "precio"));
  if (precio === null || Number.isNaN(precio) || precio < 0 || precio > 100000) return { error: "Escribe el precio en euros (0 si es gratis)." };

  const popularidad = numero(texto(formData, "popularidad")) ?? 0;
  if (!Number.isInteger(popularidad) || popularidad < 0) return { error: "La popularidad es un número entero (0 o más)." };

  const valoracion = numero(texto(formData, "valoracion"));
  if (valoracion !== null && (Number.isNaN(valoracion) || valoracion < 0 || valoracion > 5)) return { error: "La valoración va de 0 a 5." };

  const campos = {
    titulo,
    titulo_en: tituloEn || null,
    descripcion: descripcion || null,
    descripcion_en: descripcionEn || null,
    categoria: categoria || null,
    nivel,
    estado,
    enlace: enlace || null,
    fecha_prevista: fecha || null,
    precio_centimos: Math.round(precio * 100),
    popularidad,
    valoracion: valoracion === null ? null : Math.round(valoracion * 10) / 10,
  };

  const admin = createAdminClient();
  const { error } = id ? await admin.from("cursos").update(campos).eq("id", id) : await admin.from("cursos").insert(campos);
  if (error) return { error: "No se ha podido guardar el curso. Inténtalo de nuevo." };

  revalidatePath("/admin/academia");
  revalidatePath("/academia", "layout");
  return { mensaje: id ? "Cambios guardados." : "Curso creado. Ya puedes ponerle una foto desde su ficha." };
}

export async function borrarCurso(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Curso no válido." };
  const { error } = await createAdminClient().from("cursos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar el curso." };
  revalidatePath("/admin/academia");
  revalidatePath("/academia", "layout");
  return { ok: true };
}

// Copia un curso (queda oculto para que no salga a las alumnas hasta que lo revises).
export async function duplicarCurso(id: string): Promise<Estado> {
  await requireAdmin();
  if (!UUID.test(id)) return { error: "Curso no válido." };
  const admin = createAdminClient();
  const { data: origen } = await admin
    .from("cursos")
    .select("titulo, titulo_en, descripcion, descripcion_en, categoria, nivel, enlace, fecha_prevista, precio_centimos, popularidad, valoracion")
    .eq("id", id)
    .maybeSingle();
  if (!origen) return { error: "No se ha encontrado ese curso." };

  const { error } = await admin.from("cursos").insert({ ...origen, titulo: `${origen.titulo} (copia)`, estado: "oculto" });
  if (error) return { error: "No se ha podido duplicar el curso." };

  revalidatePath("/admin/academia");
  return { mensaje: `Creado «${origen.titulo} (copia)». Está oculto: revísalo y actívalo cuando quieras.` };
}

// Igual que borrarCurso, pero con el mismo formato de respuesta que el resto de listas.
export async function eliminarCurso(id: string): Promise<Estado> {
  const r = await borrarCurso(id);
  return r.ok ? { mensaje: "Curso eliminado." } : { error: r.error ?? "No se ha podido eliminar el curso." };
}
