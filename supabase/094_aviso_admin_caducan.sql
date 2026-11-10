-- Aviso para la administradora: tarifas y bonos a punto de caducar (se puede activar o desactivar en Ajustes > Notificaciones).
-- Empieza activado. No borra nada.

alter table public.profiles
  add column if not exists admin_avisa_caducan boolean not null default true;

grant update (admin_avisa_caducan) on public.profiles to authenticated;
