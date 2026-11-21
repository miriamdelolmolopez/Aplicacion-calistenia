-- Preferencias de la cuenta (Ajustes > Perfil): zona horaria, país y unidades de medida.
-- Pégalo entero en el editor SQL de Supabase y pulsa Run. Se puede ejecutar más de una vez sin problema.
-- La app funciona igual sin este archivo (usa Europa/Madrid, España, kg y cm); con él, cada persona puede elegir las suyas.

alter table public.profiles add column if not exists zona_horaria text not null default 'Europe/Madrid';
alter table public.profiles add column if not exists pais text not null default 'ES';
alter table public.profiles add column if not exists unidad_peso text not null default 'kg';
alter table public.profiles add column if not exists unidad_longitud text not null default 'cm';

alter table public.profiles drop constraint if exists profiles_unidad_peso_valida;
alter table public.profiles add constraint profiles_unidad_peso_valida check (unidad_peso in ('kg', 'lb'));

alter table public.profiles drop constraint if exists profiles_unidad_longitud_valida;
alter table public.profiles add constraint profiles_unidad_longitud_valida check (unidad_longitud in ('cm', 'in'));

notify pgrst, 'reload schema';
