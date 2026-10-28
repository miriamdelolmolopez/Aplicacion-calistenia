"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { aCentimos } from "@/lib/formato";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Estado } from "../acciones";

const SERVICIOS = ["grupal", "individual", "online"];

function texto(formData: FormData, clave: string): string {
  return String(formData.get(clave) ?? "").trim();
}

function servicioEsOnline(servicio: string): boolean {
  return servicio === "online";
}

function entero(valor: string): number {
  if (valor === "") return NaN;
  const n = Number(valor);
  return Number.isInteger(n) ? n : NaN;
}

// Crea o cambia un tipo de bono o de clase suelta. Los bonos que ya se vendieron no cambian.
export async function guardarTipoBono(_previo: Estado, formData: FormData): Promise<Estado> {
  await requireAdmin();

  const id = texto(formData, "id");
  const nombre = texto(formData, "nombre");
  const servicio = texto(formData, "servicio");
  const clases = servicioEsOnline(texto(formData, "servicio")) ? 1 : entero(texto(formData, "clases"));
  const precio = aCentimos(texto(formData, "precio"));
  const validez = entero(texto(formData, "validez_dias"));
  const orden = entero(texto(formData, "orden") || "0");
  const activo = formData.get("activo") === "on";
  const requierePago = formData.get("requiere_pago") === "on";
  const servicio2 = texto(formData, "servicio2");
  const clases2 = servicio2 ? (servicio2 === "online" ? 1 : entero(texto(formData, "clases2"))) : null;
  const iva = entero(texto(formData, "iva_porcentaje") || "21");
  const misma = formData.get("misma_duracion") === "on";
  const validez2 = servicio2 && !misma ? entero(texto(formData, "validez_dias2")) : null;

  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (!SERVICIOS.includes(servicio)) return { error: "Elige el tipo de servicio." };
  if (!(clases >= 1 && clases <= 100)) return { error: "Los créditos (clases) van de 1 a 100." };
  if (Number.isNaN(precio) || precio > 100000) return { error: "Escribe un precio válido, por ejemplo 55 o 55,50." };
  if (!(validez >= 1 && validez <= 1095)) return { error: "Los días de validez van de 1 a 1095." };
  if (!(orden >= 0 && orden <= 9999)) return { error: "El orden va de 0 a 9999." };
  if (servicio2) {
    if (!SERVICIOS.includes(servicio2) || servicio2 === servicio) return { error: "El segundo servicio del combo tiene que ser distinto del primero." };
    if (clases2 === null || !(clases2 >= 1 && clases2 <= 100)) return { error: "Los créditos del segundo servicio van de 1 a 100." };
    if (requierePago) return { error: "Una tarifa combinada no puede activarse solo al pagar: desmarca esa casilla." };
    if (validez2 !== null && !(validez2 >= 1 && validez2 <= 1095)) return { error: "Los días de validez del segundo servicio van de 1 a 1095." };
  }
  if (![0, 4, 10, 21].includes(iva)) return { error: "Elige un tipo de IVA de la lista." };

  const datos = {
    nombre,
    servicio,
    clases,
    precio_centimos: precio,
    validez_dias: validez,
    orden,
    activo,
    requiere_pago: requierePago,
    servicio2: servicio2 || null,
    clases2: servicio2 ? clases2 : null,
    iva_porcentaje: iva,
    validez_dias2: validez2,
  };

  const admin = createAdminClient();
  const { error } = id ? await admin.from("tipos_bono").update(datos).eq("id", id) : await admin.from("tipos_bono").insert(datos);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe una tarifa con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/bonos");
  revalidatePath("/admin/usuarios");
  return { mensaje: id ? "Guardado. Lo ya vendido no cambia." : "Tarifa creada. Ya se puede usar al registrar pagos." };
}

// Copia una tarifa para no empezar de cero.
export async function duplicarTarifa(id: string): Promise<Estado> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: origen } = await admin
    .from("tipos_bono")
    .select("nombre, servicio, clases, precio_centimos, validez_dias, activo, requiere_pago, servicio2, clases2, iva_porcentaje, validez_dias2")
    .eq("id", id)
    .maybeSingle();
  if (!origen) return { error: "No se ha encontrado esa tarifa." };

  const { data: existentes } = await admin.from("tipos_bono").select("nombre, orden");
  const nombres = new Set((existentes ?? []).map((e) => e.nombre));
  let nombre = `${origen.nombre} (copia)`;
  for (let n = 2; nombres.has(nombre); n++) nombre = `${origen.nombre} (copia ${n})`;
  const orden = Math.max(0, ...(existentes ?? []).map((e) => Number(e.orden) || 0)) + 10;

  const { error } = await admin.from("tipos_bono").insert({ ...origen, nombre, orden });
  if (error) return { error: "No se ha podido duplicar." };

  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/bonos");
  return { mensaje: `Creada «${nombre}». Cámbiale lo que haga falta.` };
}

// Elimina una tarifa. Si ya se ha vendido, no se puede borrar: hay que desactivarla.
export async function eliminarTarifa(id: string): Promise<Estado> {
  await requireAdmin();
  const { error } = await createAdminClient().from("tipos_bono").delete().eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "No se puede eliminar porque ya se ha vendido. Edítala y desmarca «Activa» para que no se use más."
          : "No se ha podido eliminar.",
    };
  }
  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/bonos");
  return { mensaje: "Tarifa eliminada." };
}
