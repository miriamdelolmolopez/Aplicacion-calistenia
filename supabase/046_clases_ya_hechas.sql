-- Para dar de alta a alumnas que ya tienen un bono empezado: se registra una clase que YA ha hecho
-- (fecha pasada). Descuenta una clase de su bono y queda en su historial como «asistió».
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No cambia ni borra ningún dato existente: solo añade una función nueva.

create or replace function public.registrar_clase_hecha(
  p_user uuid, p_tipo uuid, p_empieza timestamptz, p_admin uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  b record;
  sesion uuid;
  nueva uuid;
begin
  if p_empieza > now() then
    raise exception 'La clase tiene que ser de una fecha pasada (para las próximas usa Reservar)';
  end if;

  select * into t from public.tipos_clase where id = p_tipo;
  if not found then
    raise exception 'Tipo de clase no encontrado';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'La persona debe ser alumna';
  end if;

  perform public.refrescar_bonos(p_user);
  select * into b from public.bonos
  where user_id = p_user and servicio = t.servicio and estado = 'activo'
  for update;
  if not found then
    raise exception 'No tiene un bono activo de ese servicio';
  end if;
  if b.clases_restantes <= 0 then
    raise exception 'Ya no le quedan clases en el bono';
  end if;
  if b.activo_desde is not null and p_empieza < b.activo_desde then
    raise exception 'La clase es anterior al inicio del bono';
  end if;

  -- La clase se crea en el calendario pasado si todavía no existía.
  insert into public.sesiones_clase (tipo_id, empieza_en, plazas)
  values (p_tipo, p_empieza, t.plazas_max)
  on conflict (tipo_id, empieza_en) do nothing;
  select id into sesion from public.sesiones_clase where tipo_id = p_tipo and empieza_en = p_empieza;

  if exists (
    select 1 from public.reservas
    where sesion_id = sesion and user_id = p_user and estado = 'reservada'
  ) then
    raise exception 'Ya tiene registrada esa clase';
  end if;

  update public.bonos set clases_restantes = clases_restantes - 1 where id = b.id;

  insert into public.reservas (sesion_id, user_id, bono_id, asistencia, asistencia_en)
  values (sesion, p_user, b.id, 'asistio', p_empieza)
  returning id into nueva;

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (
    b.id, 'reserva', -1,
    t.nombre || ' · ' || to_char(p_empieza at time zone 'Europe/Madrid', 'DD/MM HH24:MI') || ' (ya hecha)',
    p_admin
  );

  perform public.refrescar_bonos(p_user);
  return nueva;
end;
$$;

revoke all on function public.registrar_clase_hecha(uuid, uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.registrar_clase_hecha(uuid, uuid, timestamptz, uuid) to service_role;
