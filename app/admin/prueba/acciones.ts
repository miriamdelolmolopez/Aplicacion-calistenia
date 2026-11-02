"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { generarCodigo } from "@/lib/pruebaLink";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

async function guardar(filas: { clave: string; valor: string }[]): Promise<boolean> {
  const ahora = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("ajustes")
    .upsert(filas.map((f) => ({ ...f, actualizado_en: ahora })));
  revalidatePath("/admin/prueba");
  return !error;
}

// Crea el código del link (queda apagado hasta que lo actives).
export async function crearLink(): Promise<Estado> {
  await requireAdmin("presenciales");
  const ok = await guardar([
    { clave: "prueba_codigo", valor: generarCodigo() },
    { clave: "prueba_activa", valor: "false" },
  ]);
  return ok ? { mensaje: "Link creado. Actívalo cuando quieras empezar a compartirlo." } : { error: "No se ha podido crear el link." };
}

// Enciende o apaga el link. Apagado, quien lo abre ve «Este enlace no está disponible».
export async function cambiarActivo(valor: boolean): Promise<Estado> {
  await requireAdmin("presenciales");
  const ok = await guardar([{ clave: "prueba_activa", valor: valor ? "true" : "false" }]);
  return ok ? { mensaje: valor ? "Link activado: ya se puede usar." : "Link apagado: nadie puede usarlo." } : { error: "No se ha podido guardar." };
}

// Cambia el código: el link anterior deja de funcionar.
export async function nuevoCodigo(): Promise<Estado> {
  await requireAdmin("presenciales");
  const ok = await guardar([{ clave: "prueba_codigo", valor: generarCodigo() }]);
  return ok ? { mensaje: "Código nuevo creado. El link anterior ya no funciona." } : { error: "No se ha podido cambiar el código." };
}

// Abre o cierra el registro de la app. Cerrado, solo entra quien tú das de alta o quien llega con el link de prueba.
export async function cambiarRegistro(valor: boolean): Promise<Estado> {
  await requireAdmin("presenciales");
  const ok = await guardar([{ clave: "registro_abierto", valor: valor ? "true" : "false" }]);
  return ok
    ? { mensaje: valor ? "Registro abierto: cualquiera puede crear una cuenta." : "Registro cerrado: solo entra quien tú das de alta o llega con el link de prueba." }
    : { error: "No se ha podido guardar." };
}
