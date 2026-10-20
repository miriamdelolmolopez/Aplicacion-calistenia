"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { avisarPlazaLiberada, avisarReserva } from "@/lib/avisos";
import { createAdminClient } from "@/lib/supabase/admin";

export type Asistencia = "asistio" | "no_asistio" | null;
export type Resultado = { ok: boolean; error?: string; mensaje?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refrescar() {
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/clases");
  revalidatePath("/clases");
}

// Marca si una persona vino a su clase (o lo quita si se pulsa otra vez).
export async function marcarAsistencia(reservaId: string, valor: Asistencia): Promise<Resultado> {
  await requireAdmin();
  if (!UUID.test(reservaId)) return { ok: false, error: "Reserva no válida." };
  if (valor !== null && valor !== "asistio" && valor !== "no_asistio") return { ok: false, error: "Valor no válido." };

  const { error } = await createAdminClient()
    .from("reservas")
    .update({ asistencia: valor, asistencia_en: valor ? new Date().toISOString() : null })
    .eq("id", reservaId);
  if (error) return { ok: false, error: "No se ha podido guardar." };

  refrescar();
  return { ok: true };
}

// Reserva una clase en nombre de una persona (usa su bono; puede saltarse el límite de antelación).
export async function reservarComo(userId: string, sesionId: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(sesionId)) return { ok: false, error: "Datos no válidos." };

  const { error } = await createAdminClient().rpc("reservar_clase", { p_user: userId, p_sesion: sesionId, p_admin: user.id });
  if (error) return { ok: false, error: error.message };
  after(() => avisarReserva(userId, sesionId));

  refrescar();
  return { ok: true, mensaje: "Reservada. Se ha descontado una clase de su bono." };
}

// Cancela como si lo hiciera la persona: si está fuera del plazo de cancelación, la clase le cuenta.
export async function cancelarComo(userId: string, reservaId: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(reservaId)) return { ok: false, error: "Datos no válidos." };

  const admin = createAdminClient();
  const { data: reserva } = await admin
    .from("reservas")
    .select("sesion_id, sesiones_clase(empieza_en)")
    .eq("id", reservaId)
    .maybeSingle();
  const empieza = (reserva?.sesiones_clase as unknown as { empieza_en: string } | null)?.empieza_en;
  const yaPasada = !!empieza && new Date(empieza) <= new Date();

  // En una clase que ya pasó se puede cancelar igualmente: la clase le cuenta (después se puede «Borrar» para devolvérsela).
  const { data, error } = yaPasada
    ? await admin.rpc("cancelar_reserva", { p_user: userId, p_reserva: reservaId, p_admin: user.id, p_devolver: false })
    : await admin.rpc("cancelar_reserva", { p_user: userId, p_reserva: reservaId, p_admin: null, p_devolver: null });
  if (error) return { ok: false, error: error.message };
  if (reserva && !yaPasada) after(() => avisarPlazaLiberada(reserva.sesion_id));

  refrescar();
  return {
    ok: true,
    mensaje:
      yaPasada
        ? "Cancelada. Como la clase ya había pasado, le cuenta como dada. Si quieres devolvérsela, pulsa «Borrar»."
        : data === "devuelta"
        ? "Cancelada. Se le ha devuelto la clase."
        : "Cancelada fuera del plazo: la clase le cuenta como dada. Si quieres devolvérsela, pulsa «Borrar».",
  };
}

// «Borrar»: devuelve la clase de una reserva cancelada fuera de plazo.
export async function borrarReserva(reservaId: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(reservaId)) return { ok: false, error: "Reserva no válida." };

  const { error } = await createAdminClient().rpc("devolver_reserva_cancelada", { p_reserva: reservaId, p_admin: user.id });
  if (error) return { ok: false, error: error.message };

  refrescar();
  return { ok: true, mensaje: "Borrada. Se le ha devuelto la clase." };
}
