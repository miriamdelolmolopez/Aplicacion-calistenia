-- Avisos de la administradora: cada uno se puede activar o desactivar desde Ajustes > Notificaciones.
-- Todos empiezan activados, para no perder ningún aviso.

alter table public.profiles
  add column if not exists admin_avisa_reserva boolean not null default true,
  add column if not exists admin_avisa_cancelacion boolean not null default true,
  add column if not exists admin_avisa_minimo boolean not null default true,
  add column if not exists admin_avisa_regalos boolean not null default true,
  add column if not exists admin_avisa_borrado boolean not null default true;

-- Cada persona puede cambiar sus propias preferencias (solo las usa quien es administradora).
grant update (
  admin_avisa_reserva, admin_avisa_cancelacion, admin_avisa_minimo, admin_avisa_regalos, admin_avisa_borrado
) on public.profiles to authenticated;
