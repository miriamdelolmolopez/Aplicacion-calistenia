"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { avisarPlazaLiberada, avisarReserva } from "@/lib/avisos";
import { instanteMadrid } from "@/lib/fechas";
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

// Quita la reserva decidiendo tú qué pasa con su clase: devolvérsela al bono o que la pierda.
export async function quitarReservaComo(userId: string, reservaId: string, devolver: boolean): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(reservaId)) return { ok: false, error: "Datos no válidos." };

  const admin = createAdminClient();
  const { data: reserva } = await admin
    .from("reservas")
    .select("sesion_id, user_id, sesiones_clase(empieza_en)")
    .eq("id", reservaId)
    .maybeSingle();
  if (!reserva || reserva.user_id !== userId) return { ok: false, error: "No se ha encontrado esa reserva." };
  const empieza = (reserva.sesiones_clase as unknown as { empieza_en: string } | null)?.empieza_en;
  const yaPasada = !!empieza && new Date(empieza) <= new Date();

  const { error } = await admin.rpc("cancelar_reserva", { p_user: userId, p_reserva: reservaId, p_admin: user.id, p_devolver: devolver });
  if (error) return { ok: false, error: error.message };
  if (!yaPasada) after(() => avisarPlazaLiberada(reserva.sesion_id));

  refrescar();
  revalidatePath(`/admin/reservas/como/${userId}`);
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true, mensaje: devolver ? "Reserva quitada. Se le ha devuelto la clase." : "Reserva quitada. La clase le cuenta como dada." };
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

// ---- Clases que ya pasaron (solo Miriam, para apuntar lo que hizo antes de usar la app) -------------

function refrescarPersona(userId: string) {
  refrescar();
  revalidatePath(`/admin/reservas/como/${userId}`);
  revalidatePath(`/admin/usuarios/${userId}`);
}

const AVISO_HECHA = "Registrada como hecha. Se ha descontado una clase de su bono y no se le ha avisado por correo.";

// Registra como hecha una clase del calendario que ya empezó.
export async function registrarHechaComo(userId: string, sesionId: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(sesionId)) return { ok: false, error: "Datos no válidos." };

  const admin = createAdminClient();
  const { data: s } = await admin.from("sesiones_clase").select("tipo_id, empieza_en, estado").eq("id", sesionId).maybeSingle();
  if (!s) return { ok: false, error: "No se ha encontrado esa clase." };
  if (s.estado === "cancelada") return { ok: false, error: "Esa clase estaba cancelada." };
  if (new Date(s.empieza_en).getTime() > Date.now()) return { ok: false, error: "Esa clase todavía no ha empezado: usa «Reservar»." };

  const { error } = await admin.rpc("registrar_clase_hecha", { p_user: userId, p_tipo: s.tipo_id, p_empieza: s.empieza_en, p_admin: user.id });
  if (error) return { ok: false, error: error.message };

  refrescarPersona(userId);
  return { ok: true, mensaje: AVISO_HECHA };
}

// Añade una clase hecha en un día pasado aunque no estuviera en el calendario (elige el tipo y la hora).
export async function anadirHechaComo(userId: string, tipoId: string, fecha: string, hora: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(tipoId)) return { ok: false, error: "Elige el tipo de clase." };
  const empieza = instanteMadrid(fecha, hora);
  if (!empieza) return { ok: false, error: "Escribe la hora de la clase." };
  if (empieza.getTime() > Date.now()) return { ok: false, error: "Esa hora todavía no ha llegado: usa «Reservar»." };

  const { error } = await createAdminClient().rpc("registrar_clase_hecha", { p_user: userId, p_tipo: tipoId, p_empieza: empieza.toISOString(), p_admin: user.id });
  if (error) return { ok: false, error: error.message };

  refrescarPersona(userId);
  return { ok: true, mensaje: AVISO_HECHA };
}

// Quita una clase pasada que se apuntó o se reservó y le devuelve la clase al bono.
export async function quitarHechaComo(userId: string, reservaId: string): Promise<Resultado> {
  const { user } = await requireAdmin();
  if (!UUID.test(userId) || !UUID.test(reservaId)) return { ok: false, error: "Datos no válidos." };

  const { error } = await createAdminClient().rpc("cancelar_reserva", { p_user: userId, p_reserva: reservaId, p_admin: user.id, p_devolver: true });
  if (error) return { ok: false, error: error.message };

  refrescarPersona(userId);
  return { ok: true, mensaje: "Quitada. Se le ha devuelto la clase al bono." };
}
