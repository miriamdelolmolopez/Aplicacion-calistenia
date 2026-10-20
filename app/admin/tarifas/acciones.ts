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
  const clases = entero(texto(formData, "clases"));
  const precio = aCentimos(texto(formData, "precio"));
  const validez = entero(texto(formData, "validez_dias"));
  const orden = entero(texto(formData, "orden") || "0");
  const activo = formData.get("activo") === "on";
  const requierePago = formData.get("requiere_pago") === "on";
  const servicio2 = texto(formData, "servicio2");
  const clases2 = servicio2 ? entero(texto(formData, "clases2")) : null;

  if (nombre.length < 2 || nombre.length > 80) return { error: "El nombre debe tener entre 2 y 80 letras." };
  if (!SERVICIOS.includes(servicio)) return { error: "Elige el tipo de servicio." };
  if (!(clases >= 1 && clases <= 100)) return { error: "Los créditos (clases) van de 1 a 100." };
  if (Number.isNaN(precio) || precio > 100000) return { error: "Escribe un precio válido, por ejemplo 55 o 55,50." };
  if (!(validez >= 1 && validez <= 1095)) return { error: "Los días de validez van de 1 a 1095." };
  if (!(orden >= 0 && orden <= 9999)) return { error: "El orden va de 0 a 9999." };
  if (servicio2) {
    if (!SERVICIOS.includes(servicio2) || servicio2 === servicio) return { error: "El segundo servicio del combo tiene que ser distinto del primero." };
    if (clases2 === null || !(clases2 >= 1 && clases2 <= 100)) return { error: "Los créditos del segundo servicio van de 1 a 100." };
    if (requierePago) return { error: "Un combo no puede activarse solo al pagar: desmarca esa casilla." };
  }

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
  };

  const admin = createAdminClient();
  const { error } = id ? await admin.from("tipos_bono").update(datos).eq("id", id) : await admin.from("tipos_bono").insert(datos);
  if (error) {
    return { error: error.code === "23505" ? "Ya existe un bono con ese nombre." : "No se ha podido guardar." };
  }

  revalidatePath("/admin/tarifas");
  revalidatePath("/admin/bonos");
  revalidatePath("/admin/usuarios");
  return { mensaje: id ? "Guardado. Los bonos ya vendidos no cambian." : "Creado. Ya se puede usar al dar de alta bonos." };
}
