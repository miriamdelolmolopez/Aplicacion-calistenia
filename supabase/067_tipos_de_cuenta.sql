-- Tipos de cuenta combinables: alumno/a, exalumno/a, coach, invitado/a y administradora.
--  · tambien_alumno: una administradora que además es alumna (puede reservar y tener tarifas).
--  · fue_alumno: la persona ha sido alumna alguna vez (para saber quién es exalumno/a).
--  · nuevos tipos de cuenta: «exalumno» y «coach» (coach que no es alumno).

alter table public.profiles
  add column if not exists tambien_alumno boolean not null default false,
  add column if not exists fue_alumno boolean not null default false;

update public.profiles set fue_alumno = true where rol = 'alumno' and not fue_alumno;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%''invitado''%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_rol_check check (rol in ('admin', 'alumno', 'invitado', 'exalumno', 'coach', 'archivado'));

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
  if not found or (perfil.rol not in ('alumno', 'invitado') and not (perfil.rol = 'admin' and perfil.tambien_alumno)) then
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
  -- (si tiene una prueba gratuita activa de este servicio, reserva con ella como una alumna)
  if perfil.rol = 'invitado' and not exists (
    select 1 from public.bonos
    where user_id = p_user and servicio = t.servicio and estado = 'activo'
  ) then
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

  -- ALUMNO: solo puede reservar clases de un servicio que tenga (Miriam sí puede, en su nombre).
  if p_admin is null and not exists (
    select 1 from public.perfil_servicios where user_id = p_user and servicio = t.servicio
  ) then
    raise exception 'Ya no tienes este servicio. Escribe a Miriam si quieres volver a reservar';
  end if;

  -- Se descuenta una clase de su bono.
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

revoke all on function public.reservar_clase(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.reservar_clase(uuid, uuid, uuid) to service_role;

create or replace function public.crear_bono(
  p_user uuid,
  p_tipo uuid,
  p_metodo text,
  p_pagado boolean,
  p_nota text,
  p_admin uuid,
  p_descuento uuid default null,
  p_precio int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo record;
  d record;
  nuevo uuid;
  segundo uuid;
  precio int;
  rebaja int := 0;
begin
  select * into tipo from public.tipos_bono where id = p_tipo and activo;
  if not found then
    raise exception 'Tipo de bono no válido';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and (rol = 'alumno' or (rol = 'admin' and tambien_alumno))) then
    raise exception 'La persona debe ser alumno';
  end if;
  precio := coalesce(p_precio, tipo.precio_centimos);
  if precio < 0 then
    raise exception 'El precio no es válido';
  end if;

  if p_descuento is not null then
    select * into d from public.descuentos where id = p_descuento for update;
    if not found or not d.activo then
      raise exception 'Descuento no válido';
    end if;
    if d.caduca_en is not null and d.caduca_en < (now() at time zone 'Europe/Madrid')::date then
      raise exception 'El descuento ha caducado';
    end if;
    if d.usos_max is not null and (
      select count(*) from public.pagos where descuento_id = d.id and estado <> 'anulado'
    ) >= d.usos_max then
      raise exception 'El descuento ya se ha usado el máximo de veces';
    end if;
    rebaja := case d.tipo
      when 'porcentaje' then round(precio * d.valor / 100.0)::int
      else least(d.valor, precio)
    end;
  end if;

  insert into public.bonos (user_id, tipo_bono_id, servicio, clases_total,
                            clases_restantes, validez_dias, nota)
  values (p_user, tipo.id, tipo.servicio, tipo.clases, tipo.clases,
          tipo.validez_dias, nullif(p_nota, ''))
  returning id into nuevo;

  insert into public.pagos (user_id, bono_id, importe_centimos, importe_original_centimos,
                            descuento_centimos, descuento_id, metodo, estado, pagado_en, nota)
  values (p_user, nuevo, precio - rebaja, precio, rebaja, p_descuento, p_metodo,
          case when p_pagado then 'pagado' else 'pendiente' end,
          case when p_pagado then now() else null end,
          nullif(p_nota, ''));

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (nuevo, 'alta', tipo.clases,
          tipo.nombre || case when rebaja > 0 then ' (con descuento)' else '' end, p_admin);

  -- Combo: además del primer bono, se crea el segundo (otro servicio) con su propia validez (o la misma que el primero) y el mismo pago.
  if tipo.servicio2 is not null then
    insert into public.bonos (user_id, tipo_bono_id, servicio, clases_total,
                              clases_restantes, validez_dias, nota)
    values (p_user, tipo.id, tipo.servicio2, tipo.clases2, tipo.clases2,
            coalesce(tipo.validez_dias2, tipo.validez_dias), nullif(p_nota, ''))
    returning id into segundo;

    insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
    values (segundo, 'alta', tipo.clases2, tipo.nombre || ' (combo)', p_admin);
  end if;

  perform public.refrescar_bonos(p_user);
  return nuevo;
end;
$$;

revoke all on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid, int) to service_role;
