-- Pruebas gratuitas para invitados/as: de clases (presencial grupal o personal) o de días de rutina (online).
-- La prueba es una tarifa gratuita (sin pago ni factura) con las clases o los días que se elijan al dar de alta.
-- La persona sigue siendo invitada; si tiene una prueba activa de un servicio, reserva con ella como una alumna.

-- 1. Las tres tarifas de prueba. Están ocultas (no salen al asignar tarifas) y solo las usa la app al dar de alta a un/a invitado/a.
insert into public.tipos_bono (nombre, servicio, clases, validez_dias, precio_centimos, requiere_pago, activo, orden)
values
  ('Prueba gratuita · grupal', 'grupal', 1, 14, 0, false, false, 999),
  ('Prueba gratuita · individual', 'individual', 1, 14, 0, false, false, 999),
  ('Prueba gratuita · online', 'online', 1, 7, 0, false, false, 999)
on conflict (nombre) do nothing;

-- 2. Reservar: un/a invitado/a con una prueba activa de ese servicio usa su prueba.
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

-- 3. Qué clases puede reservar: el/la invitado/a, las grupales y las de los servicios en los que tiene prueba.
drop function if exists public.clases_proximas(int);
create function public.clases_proximas(p_dias int default 14)
returns table (
  id uuid,
  tipo text,
  empieza_en timestamptz,
  plazas int,
  estado text,
  ocupadas int,
  mi_reserva uuid,
  apuntados text[],
  plazas_prueba int,
  ocupadas_prueba int,
  en_espera boolean,
  posicion int,
  hay_espera int,
  prioridad boolean,
  duracion_min int,
  apuntados_ids uuid[],
  servicio text,
  incluido boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (
    select
      coalesce((select p.rol from public.profiles p where p.id = auth.uid()), '') as rol,
      coalesce((select a.valor from public.ajustes a where a.clave = 'ver_apuntados'), 'false') = 'true' as ver,
      coalesce((
        select array_agg(distinct x.s)
        from (
          select ps.servicio as s from public.perfil_servicios ps where ps.user_id = auth.uid()
          union
          select b.servicio from public.bonos b where b.user_id = auth.uid() and b.estado in ('activo', 'en_cola')
        ) x
      ), '{}'::text[]) as servs
  )
  select
    s.id,
    t.nombre,
    s.empieza_en,
    s.plazas,
    s.estado,
    (select count(*)::int from public.reservas r
       where r.sesion_id = s.id and r.estado = 'reservada'),
    (select r.id from public.reservas r
       where r.sesion_id = s.id and r.user_id = auth.uid() and r.estado = 'reservada'),
    case
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio <> 'individual') from yo y)
      then coalesce((
        select array_agg(
          coalesce(nullif(split_part(coalesce(p.nombre, ''), ' ', 1), ''), 'Alumno')
          || case when coalesce(p.apellidos, '') <> ''
                  then ' ' || upper(left(p.apellidos, 1)) || '.' else '' end
          order by r.creado_en
        )
        from public.reservas r join public.profiles p on p.id = r.user_id
        where r.sesion_id = s.id and r.estado = 'reservada'
      ), '{}')
      else '{}'::text[]
    end,
    s.plazas_prueba,
    (select count(*)::int from public.reservas r
       where r.sesion_id = s.id and r.estado = 'reservada' and r.es_prueba),
    exists (select 1 from public.lista_espera l
              where l.sesion_id = s.id and l.user_id = auth.uid()),
    (select count(*)::int from public.lista_espera l
       where l.sesion_id = s.id
         and l.creado_en <= (
           select l2.creado_en from public.lista_espera l2
           where l2.sesion_id = s.id and l2.user_id = auth.uid()
         )),
    (select count(*)::int from public.lista_espera l where l.sesion_id = s.id),
    (
      (select count(*) from public.lista_espera l where l.sesion_id = s.id) > 0
      and now() < s.empieza_en
        - make_interval(hours => public.ajuste_numero('espera_prioridad_horas', 2))
    ),
    t.duracion_min,
    case
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio <> 'individual') from yo y)
      then coalesce((
        select array_agg(r.user_id order by r.creado_en)
        from public.reservas r
        where r.sesion_id = s.id and r.estado = 'reservada'
      ), '{}')
      else '{}'::uuid[]
    end,
    t.servicio,
    (
      select case
        when y.rol = 'admin' then true
        when y.rol = 'alumno' then
          t.servicio = any (case when cardinality(y.servs) = 0 then array['grupal'] else y.servs end)
        else t.servicio = 'grupal' or t.servicio = any (y.servs)
      end
      from yo y
    )
  from public.sesiones_clase s
  join public.tipos_clase t on t.id = s.tipo_id
  where auth.uid() is not null
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
  order by s.empieza_en;
$$;

revoke all on function public.clases_proximas(int) from public, anon;
grant execute on function public.clases_proximas(int) to authenticated;
