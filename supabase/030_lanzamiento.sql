-- Lanzamiento · cancelación distinta para individuales, DNI protegido y pagos que se conservan.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

-- 1. Horas para cancelar: 2 en grupales (ya existe) y 12 en individuales.
insert into public.ajustes (clave, valor) values ('cancelacion_horas_individual', '12')
on conflict (clave) do nothing;

create or replace function public.cancelar_reserva(
  p_user uuid, p_reserva uuid, p_admin uuid default null, p_devolver boolean default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  s record;
  devolver boolean;
  devuelta boolean := false;
  horas int;
  serv text;
begin
  select * into r from public.reservas where id = p_reserva for update;
  if not found then
    raise exception 'Reserva no encontrada';
  end if;
  if p_admin is null and r.user_id <> p_user then
    raise exception 'Esa reserva no es tuya';
  end if;
  if r.estado <> 'reservada' then
    raise exception 'La reserva ya estaba cancelada';
  end if;

  select * into s from public.sesiones_clase where id = r.sesion_id;
  select t.servicio into serv from public.tipos_clase t where t.id = s.tipo_id;
  horas := case when serv = 'individual'
    then public.ajuste_numero('cancelacion_horas_individual', 12)
    else public.ajuste_numero('cancelacion_horas', 2) end;

  if p_admin is null then
    if s.empieza_en <= now() then
      raise exception 'La clase ya ha empezado';
    end if;
    devolver := now() <= s.empieza_en - make_interval(hours => horas);
  else
    devolver := coalesce(p_devolver, true);
  end if;

  update public.reservas
  set estado = case when devolver then 'cancelada' else 'cancelada_tarde' end,
      cancelada_en = now()
  where id = r.id;

  if r.es_prueba then
    devuelta := devolver;
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  elsif devolver and r.bono_id is not null then
    devuelta := public.devolver_clase_a_bono(r.bono_id, 1, 'Cancelación de reserva', p_admin);
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  end if;

  return case when devuelta then 'devuelta' else 'perdida' end;
end;
$$;

-- 2. El DNI, una vez guardado, solo lo puede cambiar la administradora
--    (así nadie se salta la clase de prueba única cambiando de DNI).
create or replace function public.proteger_dni()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and old.dni is not null
     and new.dni is distinct from old.dni
     and not public.es_admin() then
    raise exception 'El DNI solo lo puede cambiar Miriam';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_dni_perfil on public.profiles;
create trigger proteger_dni_perfil
  before update on public.profiles
  for each row execute function public.proteger_dni();

-- 3. Los pagos se conservan si se borra a la persona (obligación fiscal):
--    quedan con su nombre y DNI anotados, sin enlace a la cuenta.
alter table public.pagos add column if not exists persona_nombre text;
alter table public.pagos add column if not exists persona_dni text;
alter table public.pagos alter column user_id drop not null;
alter table public.pagos drop constraint if exists pagos_user_id_fkey;
alter table public.pagos
  add constraint pagos_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;

create or replace function public.guardar_datos_pagos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pagos
  set persona_nombre = nullif(trim(coalesce(old.nombre, '') || ' ' || coalesce(old.apellidos, '')), ''),
      persona_dni = old.dni
  where user_id = old.id;
  return old;
end;
$$;

drop trigger if exists antes_de_borrar_perfil on public.profiles;
create trigger antes_de_borrar_perfil
  before delete on public.profiles
  for each row execute function public.guardar_datos_pagos();
