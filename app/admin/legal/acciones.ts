"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { DOCUMENTOS, DOCUMENTOS_CON_ACEPTACION, type Documento } from "@/lib/legalTexto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoLegal = { ok: boolean; error?: string; mensaje?: string };

function refrescar(documento: string) {
  revalidatePath("/admin/legal");
  revalidatePath(`/admin/legal/${documento}`);
  revalidatePath(`/legal/${documento}`);
}

// Nombre de versión con la fecha y hora de Madrid, por ejemplo 2026-10-21-1530.
function nombreVersion(): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const v = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  const hora = v("hour") === "24" ? "00" : v("hour");
  return `${v("year")}-${v("month")}-${v("day")}-${hora}${v("minute")}`;
}

// «menor»: corrige el texto vigente sin pedir que se acepte otra vez (erratas, aclaraciones).
// «nueva»: publica una versión nueva y todas las personas tendrán que aceptarla para seguir usando la app
// (solo para la política de privacidad y los términos).
export async function guardarTextoLegal(documento: string, contenido: string, modo: "menor" | "nueva"): Promise<ResultadoLegal> {
  await requireAdmin();
  if (!(DOCUMENTOS as readonly string[]).includes(documento)) return { ok: false, error: "Documento no válido." };
  const doc = documento as Documento;
  const texto = contenido.replace(/\r\n/g, "\n").trim() + "\n";
  if (texto.trim().length < 50) return { ok: false, error: "El texto es demasiado corto." };
  if (texto.length > 200000) return { ok: false, error: "El texto es demasiado largo." };
  if (modo === "nueva" && !DOCUMENTOS_CON_ACEPTACION.includes(doc)) {
    return { ok: false, error: "Este documento no necesita que se acepte de nuevo: guarda los cambios sin más." };
  }

  const admin = createAdminClient();
  const { data: vigente } = await admin.from("textos_legales").select("id, version").eq("documento", doc).eq("vigente", true).maybeSingle();

  if (modo === "menor") {
    if (vigente) {
      const { error } = await admin.from("textos_legales").update({ contenido: texto }).eq("id", vigente.id);
      if (error) return { ok: false, error: "No se ha podido guardar." };
    } else {
      const { error } = await admin.from("textos_legales").insert({ documento: doc, version: nombreVersion(), contenido: texto, vigente: true });
      if (error) return { ok: false, error: "No se ha podido guardar." };
    }
    refrescar(doc);
    return { ok: true, mensaje: "Guardado. Ya se ve en la web. Nadie tiene que volver a aceptarlo." };
  }

  let version = nombreVersion();
  const { data: igual } = await admin.from("textos_legales").select("id").eq("documento", doc).eq("version", version).maybeSingle();
  if (igual) version += "b";
  if (vigente) {
    const { error } = await admin.from("textos_legales").update({ vigente: false }).eq("id", vigente.id);
    if (error) return { ok: false, error: "No se ha podido publicar." };
  }
  const { error } = await admin.from("textos_legales").insert({ documento: doc, version, contenido: texto, vigente: true });
  if (error) {
    if (vigente) await admin.from("textos_legales").update({ vigente: true }).eq("id", vigente.id);
    return { ok: false, error: "No se ha podido publicar." };
  }

  refrescar(doc);
  return { ok: true, mensaje: `Publicada la versión ${version}. Cada persona tendrá que aceptarla la próxima vez que entre.` };
}
