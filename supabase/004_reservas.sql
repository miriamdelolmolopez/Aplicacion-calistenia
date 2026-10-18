-- Fase 4 · Parte C: reservas, ajustes y funciones de reserva
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. MÍNIMO DE ALUMNOS: 1 por defecto -----------------------------------------
alter table public.tipos_clase alter column minimo_alumnos set default 1;
update public.tipos_clase set minimo_alumnos = 1 where minimo_alumnos = 0;

-- 2. AJUSTES (editables desde el panel) ---------------------------------------
create table if not exists public.ajustes (
  clave text primary key,
  valor text not null,
  actualizado_en timestamptz not null default now()
);

insert into public.ajustes (clave, valor) values
  ('cancelacion_horas', '2'),
  ('reserva_dias_max', '14'),
  ('ver_apuntados', 'true')
on conflict (clave) do nothing;

-- 3. RESERVAS -----------------------------------------------------------------
-- Estados: reservada, cancelada (a tiempo), cancelada_tarde (sin devolución),
-- cancelada_clase (la clase se canceló).
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones_clase (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  bono_id uuid references public.bonos (id) on delete set null,
  estado text not null default 'reservada'
    check (estado in ('reservada', 'cancelada', 'cancelada_tarde', 'cancelada_clase')),
  clase_devuelta boolean not null default false,
  creado_en timestamptz not null default now(),
  cancelada_en timestamptz
);

-- Una persona no puede tener dos reservas activas en la misma clase.
create unique index if not exists reservas_una_activa
  on public.reservas (sesion_id, user_id) where estado = 'reservada';
create index if not exists reservas_user on public.reservas (user_id);
create index if not exists reservas_sesion on public.reservas (sesion_id);

-- 4. FUNCIONES ----------------------------------------------------------------

create or replace function public.ajuste_numero(p_clave text, p_defecto int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select a.valor::int from public.ajustes a where a.clave = p_clave), p_defecto);
$$;

-- Devuelve clases a un bono (y lo reabre si estaba agotado).
create or replace function public.devolver_clase_a_bono(
  p_bono uuid, p_clases int, p_nota text, p_admin uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  select * into b from public.bonos where id = p_bono for update;
  if not found or b.estado = 'anulado' then
    return false;
  end if;

  update public.bonos set clases_restantes = clases_restantes + p_clases where id = p_bono;

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (p_bono, 'devolucion', p_clases, nullif(p_nota, ''), p_admin);

  update public.bonos set estado = 'en_cola'
  where id = p_bono and estado in ('agotado', 'caducado') and caduca_en > now();

  perform public.refrescar_bonos(b.user_id);
  return true;
end;
$$;

-- Reservar una plaza. Bloquea la clase mientras comprueba, para que nunca se
-- pase de plazas aunque varias personas reserven a la vez.
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
  b record;
  nombre_tipo text;
  ocupadas int;
  nueva uuid;
  dias_max int := public.ajuste_numero('reserva_dias_max', 14);
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
  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'Solo los alumnos con bono pueden reservar';
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

  perform public.refrescar_bonos(p_user);

  select * into b from public.bonos
  where user_id = p_user and servicio = 'grupal' and estado = 'activo'
  for update;
  if not found then
    raise exception 'No tienes ningún bono activo';
  end if;
  if b.caduca_en is not null and b.caduca_en < s.empieza_en then
    raise exception 'Tu bono caduca antes de esta clase';
  end if;

  update public.bonos set clases_restantes = clases_restantes - 1 where id = b.id;

  select nombre into nombre_tipo from public.tipos_clase where id = s.tipo_id;

  insert into public.reservas (sesion_id, user_id, bono_id)
  values (p_sesion, p_user, b.id)
  returning id into nueva;

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (
    b.id, 'reserva', -1,
    nombre_tipo || ' · ' || to_char(s.empieza_en at time zone 'Europe/Madrid', 'DD/MM HH24:MI'),
    p_admin
  );

  perform public.refrescar_bonos(p_user);
  return nueva;
end;
$$;

-- Cancelar una reserva. La persona: se devuelve la clase si cancela con más de
-- las horas indicadas en los ajustes. La administradora decide si se devuelve.
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

  if devolver and r.bono_id is not null then
    devuelta := public.devolver_clase_a_bono(r.bono_id, 1, 'Cancelación de reserva', p_admin);
    update public.reservas set clase_devuelta = devuelta where id = r.id;
  end if;

  return case when devuelta then 'devuelta' else 'perdida' end;
end;
$$;

-- Cancelar una clase entera: devuelve su clase a todos los apuntados y amplía
-- su bono los días indicados (0 = sin ampliar).
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
    if r.bono_id is not null then
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

-- Clases de los próximos días con plazas ocupadas, la reserva de quien consulta
-- y (si Miriam lo permite) quién está apuntado, como "Nombre I.".
create or replace function public.clases_proximas(p_dias int default 14)
returns table (
  id uuid,
  tipo text,
  empieza_en timestamptz,
  plazas int,
  estado text,
  ocupadas int,
  mi_reserva uuid,
  apuntados text[]
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
    end
  from public.sesiones_clase s
  join public.tipos_clase t on t.id = s.tipo_id
  where auth.uid() is not null
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
  order by s.empieza_en;
$$;

revoke all on function public.ajuste_numero(text, int) from public, anon, authenticated;
revoke all on function public.devolver_clase_a_bono(uuid, int, text, uuid) from public, anon, authenticated;
revoke all on function public.reservar_clase(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancelar_reserva(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.cancelar_clase(uuid, text, int, uuid) from public, anon, authenticated;
revoke all on function public.clases_proximas(int) from public, anon;

grant execute on function public.ajuste_numero(text, int) to service_role;
grant execute on function public.devolver_clase_a_bono(uuid, int, text, uuid) to service_role;
grant execute on function public.reservar_clase(uuid, uuid, uuid) to service_role;
grant execute on function public.cancelar_reserva(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.cancelar_clase(uuid, text, int, uuid) to service_role;
grant execute on function public.clases_proximas(int) to authenticated;

-- 5. SEGURIDAD ----------------------------------------------------------------
-- Cada persona solo VE sus reservas; la administradora ve todas. Los ajustes los
-- puede leer cualquier persona con cuenta. Nadie puede escribir desde el navegador.
alter table public.ajustes enable row level security;
alter table public.reservas enable row level security;

revoke all on public.ajustes from anon, authenticated;
revoke all on public.reservas from anon, authenticated;
grant select on public.ajustes to authenticated;
grant select on public.reservas to authenticated;

drop policy if exists ajustes_ver on public.ajustes;
create policy ajustes_ver on public.ajustes
  for select to authenticated using (true);

drop policy if exists reservas_ver on public.reservas;
create policy reservas_ver on public.reservas
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));
