-- Las clases grupales de mañana (antes de las 14:00) se pueden cancelar hasta 12 horas antes; las de tarde, 2 horas antes.
-- Si un tipo de clase tiene su propio plazo (por ejemplo Freestyle), manda el suyo. No borra datos.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.

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
  sin_servicio boolean := false;
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
  -- Plazo: el propio del tipo de clase si lo tiene; si no, 12 h para las individuales y para las grupales de mañana
  -- (las que empiezan antes de las 14:00, hora de Madrid) y 2 h para el resto de grupales.
  horas := coalesce(horas_tipo, case
    when serv = 'individual' then public.ajuste_numero('cancelacion_horas_individual', 12)
    when extract(hour from (s.empieza_en at time zone 'Europe/Madrid')) < 14 then public.ajuste_numero('cancelacion_horas_manana', 12)
    else public.ajuste_numero('cancelacion_horas', 2) end);

  if p_admin is null then
    if s.empieza_en <= now() then
      raise exception 'La clase ya ha empezado';
    end if;
    devolver := now() <= s.empieza_en - make_interval(hours => horas);
  else
    devolver := coalesce(p_devolver, true);
  end if;

  -- Si ya no tiene ese servicio, puede cancelar pero no se le devuelve la clase.
  sin_servicio := p_admin is null and not r.es_prueba and not exists (
    select 1 from public.perfil_servicios where user_id = r.user_id and servicio = serv
  );

  update public.reservas
  set estado = case when devolver then 'cancelada' else 'cancelada_tarde' end,
      cancelada_en = now()
  where id = r.id;
  if sin_servicio then
    devolver := false;
    update public.reservas set estado = 'cancelada' where id = r.id;
  end if;

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

revoke all on function public.cancelar_reserva(uuid, uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.cancelar_reserva(uuid, uuid, uuid, boolean) to service_role;
