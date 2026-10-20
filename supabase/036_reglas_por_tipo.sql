-- Reglas por tipo de clase: cuánto antes se reserva, cuánto antes se cancela y cuántos créditos gasta.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie. Si no se rellena nada, todo sigue como hasta ahora (ajustes generales y 1 crédito).

alter table public.tipos_clase add column if not exists reserva_dias_max int
  check (reserva_dias_max is null or reserva_dias_max between 1 and 365);
alter table public.tipos_clase add column if not exists cancelacion_horas int
  check (cancelacion_horas is null or cancelacion_horas between 0 and 168);
alter table public.tipos_clase add column if not exists creditos int not null default 1
  check (creditos between 1 and 20);

-- Cada reserva anota cuántos créditos costó (para devolver los mismos si se cancela).
alter table public.reservas add column if not exists creditos int not null default 1;

create or replace function public.reservar_clase(
  p_user uuid, p_sesion uuid, p_admin uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  t record;
  b record;
  perfil record;
  nombre_tipo text;
  ocupadas int;
  ocupadas_prueba int;
  nueva uuid;
  dias_max int;
  coste int := 1;
  horas_prioridad int := public.ajuste_numero('espera_prioridad_horas', 2);
begin
  select * into s from public.sesiones_clase where id = p_sesion for update;
  if not found then
    raise exception 'Clase no encontrada';
  end if;
  if s.estado <> 'programada' then
    raise exception 'La clase está cancelada';
  end if;
  if s.empieza_en <= now() then
    raise exception 'La clase ya ha empezado';
  end if;
  select * into t from public.tipos_clase where id = s.tipo_id;
  dias_max := coalesce(t.reserva_dias_max, public.ajuste_numero('reserva_dias_max', 14));
  if p_admin is null and s.empieza_en > now() + make_interval(days => dias_max) then
    raise exception 'Todavía no se puede reservar esa clase';
  end if;
  select * into perfil from public.profiles where id = p_user;
  if not found or perfil.rol not in ('alumno', 'invitado') then
    raise exception 'Solo los alumnos con bono o los invitados pueden reservar';
  end if;

  if exists (
    select 1 from public.reservas
    where sesion_id = p_sesion and user_id = p_user and estado = 'reservada'
  ) then
    raise exception 'Ya tienes plaza en esta clase';
  end if;

  select count(*) into ocupadas
  from public.reservas where sesion_id = p_sesion and estado = 'reservada';
  if ocupadas >= s.plazas then
    raise exception 'La clase está completa';
  end if;

  -- Mientras haya lista de espera, la plaza libre es solo para ella
  -- (hasta las horas de prioridad antes de la clase).
  if p_admin is null
     and exists (select 1 from public.lista_espera where sesion_id = p_sesion)
     and now() < s.empieza_en - make_interval(hours => horas_prioridad)
     and not exists (
       select 1 from public.lista_espera where sesion_id = p_sesion and user_id = p_user
     ) then
    raise exception 'La plaza está reservada para la lista de espera';
  end if;

  select nombre into nombre_tipo from public.tipos_clase where id = s.tipo_id;

  -- INVITADO: clase de prueba gratuita, sin bono.
  if perfil.rol = 'invitado' then
    if t.servicio <> 'grupal' then
      raise exception 'Esta clase no admite clase de prueba';
    end if;
    if not perfil.datos_completos then
      raise exception 'Completa tus datos para reservar la clase de prueba';
    end if;
    if public.prueba_gastada(p_user) then
      raise exception 'Ya has usado tu clase de prueba';
    end if;

    select count(*) into ocupadas_prueba
    from public.reservas
    where sesion_id = p_sesion and es_prueba and estado = 'reservada';
    if ocupadas_prueba >= least(s.plazas_prueba, s.plazas) then
      raise exception 'No quedan plazas de clase de prueba en esta clase';
    end if;

    insert into public.reservas (sesion_id, user_id, bono_id, es_prueba)
    values (p_sesion, p_user, null, true)
    returning id into nueva;
    return nueva;
  end if;

  -- ALUMNO: se descuenta una clase de su bono.
  perform public.refrescar_bonos(p_user);

  select * into b from public.bonos
  where user_id = p_user and servicio = t.servicio and estado = 'activo'
  for update;
  if not found then
    raise exception 'No tienes ningún bono activo';
  end if;
  if b.caduca_en is not null and b.caduca_en < s.empieza_en then
    raise exception 'Tu bono caduca antes de esta clase';
  end if;

  coste := greatest(1, coalesce(t.creditos, 1));
  if b.clases_restantes < coste then
    raise exception 'Esta clase gasta % créditos y solo te quedan %', coste, b.clases_restantes;
  end if;
  update public.bonos set clases_restantes = clases_restantes - coste where id = b.id;

  insert into public.reservas (sesion_id, user_id, bono_id, creditos)
  values (p_sesion, p_user, b.id, coste)
  returning id into nueva;

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (
    b.id, 'reserva', -coste,
    nombre_tipo || ' · ' || to_char(s.empieza_en at time zone 'Europe/Madrid', 'DD/MM HH24:MI'),
    p_admin
  );

  -- Si estaba en la lista de espera, sale de ella.
  delete from public.lista_espera where sesion_id = p_sesion and user_id = p_user;

  perform public.refrescar_bonos(p_user);
  return nueva;
end;
$$;

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
  horas_tipo int;
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
  select t.servicio, t.cancelacion_horas into serv, horas_tipo from public.tipos_clase t where t.id = s.tipo_id;
  horas := coalesce(horas_tipo, case when serv = 'individual'
    then public.ajuste_numero('cancelacion_horas_individual', 12)
    else public.ajuste_numero('cancelacion_horas', 2) end);

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
    devuelta := public.devolver_clase_a_bono(r.bono_id, r.creditos, 'Cancelación de reserva', p_admin);
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  end if;

  return case when devuelta then 'devuelta' else 'perdida' end;
end;
$$;

create or replace function public.cancelar_clase(
  p_sesion uuid, p_motivo text, p_dias int, p_admin uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  r record;
  total int := 0;
  devuelta boolean;
begin
  if p_dias < 0 or p_dias > 60 then
    raise exception 'Los días de ampliación deben estar entre 0 y 60';
  end if;

  select * into s from public.sesiones_clase where id = p_sesion for update;
  if not found then
    raise exception 'Clase no encontrada';
  end if;
  if s.estado = 'cancelada' then
    raise exception 'La clase ya está cancelada';
  end if;

  update public.sesiones_clase
  set estado = 'cancelada', motivo_cancelacion = nullif(p_motivo, '')
  where id = p_sesion;

  delete from public.lista_espera where sesion_id = p_sesion;

  for r in
    select * from public.reservas
    where sesion_id = p_sesion and estado = 'reservada'
    order by creado_en
    for update
  loop
    update public.reservas
    set estado = 'cancelada_clase', cancelada_en = now()
    where id = r.id;

    devuelta := false;
    if r.es_prueba then
      devuelta := true; -- conserva su clase de prueba
    elsif r.bono_id is not null then
      devuelta := public.devolver_clase_a_bono(
        r.bono_id, r.creditos,
        'Clase cancelada' || coalesce(': ' || nullif(p_motivo, ''), ''),
        p_admin
      );
      if devuelta and p_dias > 0 then
        update public.bonos
        set caduca_en = caduca_en + make_interval(days => p_dias)
        where id = r.bono_id and caduca_en is not null;

        insert into public.movimientos_bono (bono_id, tipo, dias, nota, creado_por)
        values (r.bono_id, 'ampliacion', p_dias, 'Ampliación por clase cancelada', p_admin);
      end if;
    end if;

    update public.reservas set clase_devuelta = devuelta where id = r.id;
    total := total + 1;
  end loop;

  return total;
end;
$$;

create or replace function public.devolver_reserva_cancelada(p_reserva uuid, p_admin uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  devuelta boolean := false;
begin
  select * into r from public.reservas where id = p_reserva for update;
  if not found then
    raise exception 'Reserva no encontrada';
  end if;
  if r.estado <> 'cancelada_tarde' or r.clase_devuelta then
    raise exception 'Esa reserva no se puede devolver';
  end if;

  if r.es_prueba then
    -- Recupera su clase de prueba.
    update public.reservas set estado = 'cancelada', clase_devuelta = true where id = r.id;
    return true;
  end if;

  if r.bono_id is not null then
    devuelta := public.devolver_clase_a_bono(r.bono_id, r.creditos, 'Reserva borrada por la administradora', p_admin);
  end if;
  update public.reservas set estado = 'cancelada', clase_devuelta = devuelta where id = r.id;
  return devuelta;
end;
$$;
