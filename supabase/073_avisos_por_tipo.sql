-- Notificaciones: un interruptor por cada tipo de correo.
--  · avisos_reserva       confirmación de reserva (ya existía)
--  · avisos_cancelacion   NUEVO: confirmación de que has cancelado tu reserva
--  · avisos_recordatorio  recordatorio de clase (ya existía)
--  · avisos_bono          el bono está a punto de caducar (ya existía)
--  · avisos_bono_clases   NUEVO: se te acaban las clases
--  · avisos_inactividad   NUEVO: llevas tiempo sin venir
--  · avisos_cumpleanos    NUEVO: felicitación de cumpleaños
-- Siempre se mandan (no se pueden desactivar): clase cancelada, plaza liberada y aniversario.
-- Además se arregla el permiso que faltaba: «Recordatorio» y «Mensajes de Miriam» no se podían desmarcar.
-- Lo que cada persona tenía marcado se respeta. No borra ningún dato.

alter table public.profiles
  add column if not exists avisos_cancelacion boolean not null default true,
  add column if not exists avisos_bono_clases boolean not null default true,
  add column if not exists avisos_inactividad boolean not null default true,
  add column if not exists avisos_cumpleanos boolean not null default true;

-- Quien tenía desactivada la confirmación de reservas, el bono o los mensajes, mantiene su decisión en los avisos nuevos.
update public.profiles
set avisos_cancelacion = avisos_reserva,
    avisos_bono_clases = avisos_bono,
    avisos_inactividad = avisos_novedades;

grant update (
  avisos_reserva, avisos_recordatorio, avisos_bono, avisos_novedades,
  avisos_cancelacion, avisos_bono_clases, avisos_inactividad, avisos_cumpleanos
) on public.profiles to authenticated;
