-- Fase 4 · Parte D: lista de espera y clase de prueba
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. COLUMNAS NUEVAS ----------------------------------------------------------
-- El tipo de clase indica a qué servicio pertenece (solo "grupal" admite prueba).
alter table public.tipos_clase
  add column if not exists servicio text not null default 'grupal'
    check (servicio in ('grupal', 'individual', 'online'));

-- Plazas para invitados: por defecto la mitad (hacia abajo). Editable.
alter table public.tipos_clase
  add column if not exists plazas_prueba int not null default 0 check (plazas_prueba >= 0);
update public.tipos_clase set plazas_prueba = plazas_max / 2 where plazas_prueba = 0;

alter table public.sesiones_clase
  add column if not exists plazas_prueba int not null default 0 check (plazas_prueba >= 0);
update public.sesiones_clase set plazas_prueba = plazas / 2 where plazas_prueba = 0;

alter table public.reservas
  add column if not exists es_prueba boolean not null default false;

insert into public.ajustes (clave, valor) values ('espera_prioridad_horas', '2')
on conflict (clave) do nothing;

-- 2. LISTA DE ESPERA ------------------------------------------------------------
create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones_clase (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (sesion_id, user_id)
);
create index if not exists lista_espera_sesion on public.lista_espera (sesion_id);

-- 3. FUNCIONES ----------------------------------------------------------------

-- ¿Ya ha gastado la clase de prueba (esta cuenta u otra con el mismo teléfono)?
-- Cuenta como gastada si tiene una reserva de prueba vigente o cancelada tarde.
create or replace function public.prueba_gastada(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reservas r
    join public.profiles pr on pr.id = r.user_id
    join public.profiles yo on yo.id = p_user
    where r.es_prueba
      and r.estado in ('reservada', 'cancelada_tarde')
      and (
        r.user_id = p_user
        or (
          length(regexp_replace(coalesce(yo.telefono, ''), '\D', '', 'g')) >= 9
          and right(regexp_replace(coalesce(pr.telefono, ''), '\D', '', 'g'), 9)
            = right(regexp_replace(coalesce(yo.telefono, ''), '\D', '', 'g'), 9)
        )
      )
  );
$$;

create or replace function public.mi_prueba_gastada()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then true else public.prueba_gastada(auth.uid()) end;
$$;

-- Las clases nuevas heredan las plazas de prueba del tipo de clase.
create or replace function public.generar_clases(semanas int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas int := 0;
  nuevas int;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  dia date;
  fila record;
  inicio timestamptz;
begin
  if semanas < 1 or semanas > 12 then
    raise exception 'Semanas entre 1 y 12';
  end if;

  for dia in
    select generate_series(hoy, hoy + (semanas * 7), interval '1 day')::date
  loop
    for fila in
      select h.hora, t.id as tipo_id, t.plazas_max, t.plazas_prueba
      from public.horario_semanal h
      join public.tipos_clase t on t.id = h.tipo_id
      where h.activo and t.activo
        and h.dia_semana = extract(isodow from dia)
    loop
      inicio := (dia + fila.hora) at time zone 'Europe/Madrid';
      if inicio > now() then
        insert into public.sesiones_clase (tipo_id, empieza_en, plazas, plazas_prueba)
        values (fila.tipo_id, inicio, fila.plazas_max, least(fila.plazas_prueba, fila.plazas_max))
        on conflict (tipo_id, empieza_en) do nothing;
        get diagnostics nuevas = row_count;
        creadas := creadas + nuevas;
      end if;
    end loop;
  end loop;

  return creadas;
end;
$$;

-- Reservar una plaza (alumno con bono, o invitado con su clase de prueba).
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
  dias_max int := public.ajuste_numero('reserva_dias_max', 14);
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
  if p_admin is null and s.empieza_en > now() + make_interval(days => dias_max) then
    raise exception 'Todavía no se puede reservar esa clase';
  end if;

  select * into t from public.tipos_clase where id = s.tipo_id;
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

  update public.bonos set clases_restantes = clases_restantes - 1 where id = b.id;

  insert into public.reservas (sesion_id, user_id, bono_id)
  values (p_sesion, p_user, b.id)
  returning id into nueva;

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (
    b.id, 'reserva', -1,
    nombre_tipo || ' · ' || to_char(s.empieza_en at time zone 'Europe/Madrid', 'DD/MM HH24:MI'),
    p_admin
  );

  -- Si estaba en la lista de espera, sale de ella.
  delete from public.lista_espera where sesion_id = p_sesion and user_id = p_user;

  perform public.refrescar_bonos(p_user);
  return nueva;
end;
$$;

-- Cancelar una reserva (la prueba solo se pierde si cancela tarde).
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
  horas int := public.ajuste_numero('cancelacion_horas', 2);
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
    -- Sin bono: "devuelta" significa que conserva su clase de prueba.
    devuelta := devolver;
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  elsif devolver and r.bono_id is not null then
    devuelta := public.devolver_clase_a_bono(r.bono_id, 1, 'Cancelación de reserva', p_admin);
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  end if;

  return case when devuelta then 'devuelta' else 'perdida' end;
end;
$$;

-- Cancelar una clase entera (también vacía su lista de espera).
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
        r.bono_id, 1,
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

-- Apuntarse a la lista de espera de una clase completa (sin coste).
create or replace function public.unirse_lista_espera(p_user uuid, p_sesion uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  t record;
  b record;
  ocupadas int;
  posicion int;
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

  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'Solo los alumnos pueden apuntarse a la lista de espera';
  end if;
  if exists (
    select 1 from public.reservas
    where sesion_id = p_sesion and user_id = p_user and estado = 'reservada'
  ) then
    raise exception 'Ya tienes plaza en esta clase';
  end if;

  select count(*) into ocupadas
  from public.reservas where sesion_id = p_sesion and estado = 'reservada';
  if ocupadas < s.plazas then
    raise exception 'La clase todavía tiene plazas libres';
  end if;

  perform public.refrescar_bonos(p_user);
  select * into b from public.bonos
  where user_id = p_user and servicio = t.servicio and estado = 'activo';
  if not found then
    raise exception 'No tienes ningún bono activo';
  end if;
  if b.caduca_en is not null and b.caduca_en < s.empieza_en then
    raise exception 'Tu bono caduca antes de esta clase';
  end if;

  insert into public.lista_espera (sesion_id, user_id)
  values (p_sesion, p_user)
  on conflict (sesion_id, user_id) do nothing;

  select count(*) into posicion
  from public.lista_espera l
  where l.sesion_id = p_sesion
    and l.creado_en <= (
      select l2.creado_en from public.lista_espera l2
      where l2.sesion_id = p_sesion and l2.user_id = p_user
    );
  return posicion;
end;
$$;

create or replace function public.salir_lista_espera(p_user uuid, p_sesion uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.lista_espera where sesion_id = p_sesion and user_id = p_user;
end;
$$;

-- Clases de los próximos días con todo lo que necesita la pantalla.
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
  prioridad boolean
)
language sql
stable
security definer
set search_path = public
as $$
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
      when (select a.valor from public.ajustes a where a.clave = 'ver_apuntados') = 'true'
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
    )
  from public.sesiones_clase s
  join public.tipos_clase t on t.id = s.tipo_id
  where auth.uid() is not null
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
  order by s.empieza_en;
$$;

revoke all on function public.prueba_gastada(uuid) from public, anon, authenticated;
revoke all on function public.mi_prueba_gastada() from public, anon;
revoke all on function public.generar_clases(int) from public, anon, authenticated;
revoke all on function public.reservar_clase(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancelar_reserva(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.cancelar_clase(uuid, text, int, uuid) from public, anon, authenticated;
revoke all on function public.unirse_lista_espera(uuid, uuid) from public, anon, authenticated;
revoke all on function public.salir_lista_espera(uuid, uuid) from public, anon, authenticated;
revoke all on function public.clases_proximas(int) from public, anon;

grant execute on function public.prueba_gastada(uuid) to service_role;
grant execute on function public.mi_prueba_gastada() to authenticated;
grant execute on function public.generar_clases(int) to service_role;
grant execute on function public.reservar_clase(uuid, uuid, uuid) to service_role;
grant execute on function public.cancelar_reserva(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.cancelar_clase(uuid, text, int, uuid) to service_role;
grant execute on function public.unirse_lista_espera(uuid, uuid) to service_role;
grant execute on function public.salir_lista_espera(uuid, uuid) to service_role;
grant execute on function public.clases_proximas(int) to authenticated;

-- 4. SEGURIDAD ----------------------------------------------------------------
-- Cada persona solo ve sus entradas en la lista de espera; la administradora ve todas.
alter table public.lista_espera enable row level security;
revoke all on public.lista_espera from anon, authenticated;
grant select on public.lista_espera to authenticated;

drop policy if exists lista_espera_ver on public.lista_espera;
create policy lista_espera_ver on public.lista_espera
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));
