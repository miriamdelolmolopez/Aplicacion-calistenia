-- Cambiar la tarifa y las fechas de un bono, quitar una tarifa y anular un pago ya cobrado.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- Solo AÑADE tres funciones nuevas. No cambia ni borra ningún dato existente.

-- 1) Cambiar la tarifa y/o las fechas de un bono activo o en espera.
--    Las clases ya usadas se respetan: si pasa de 4 a 8 clases y había usado 3, le quedan 5.
create or replace function public.cambiar_bono(
  p_bono uuid, p_tipo uuid, p_desde timestamptz, p_hasta timestamptz, p_nota text, p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  t record;
  antes text;
  usadas int;
  restantes int;
  nuevo_desde timestamptz;
  nuevo_hasta timestamptz;
  combo boolean;
begin
  select * into b from public.bonos where id = p_bono for update;
  if not found then
    raise exception 'Bono no encontrado';
  end if;
  if b.estado not in ('activo', 'en_cola') then
    raise exception 'Solo se pueden cambiar bonos activos o en espera';
  end if;

  -- Cambio de tarifa
  if p_tipo is not null and p_tipo <> b.tipo_bono_id then
    select * into t from public.tipos_bono where id = p_tipo;
    if not found then
      raise exception 'Tarifa no encontrada';
    end if;

    select exists (
      select 1 from public.bonos o
      where o.user_id = b.user_id and o.tipo_bono_id = b.tipo_bono_id and o.creado_en = b.creado_en and o.id <> b.id
    ) into combo;
    if combo then
      raise exception 'Esta tarifa es combinada: cambia solo sus fechas, no la tarifa';
    end if;

    if b.estado = 'activo' and t.servicio <> b.servicio and exists (
      select 1 from public.bonos o
      where o.user_id = b.user_id and o.servicio = t.servicio and o.estado = 'activo' and o.id <> b.id
    ) then
      raise exception 'Ya tiene un bono activo de ese servicio';
    end if;

    select nombre into antes from public.tipos_bono where id = b.tipo_bono_id;
    usadas := b.clases_total - b.clases_restantes;
    restantes := greatest(t.clases - usadas, 0);

    update public.bonos
    set tipo_bono_id = t.id,
        servicio = t.servicio,
        clases_total = t.clases,
        clases_restantes = restantes,
        validez_dias = t.validez_dias
    where id = b.id;

    insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
    values (
      b.id, 'ajuste', restantes - b.clases_restantes,
      'Cambio de tarifa: ' || coalesce(antes, '') || ' → ' || t.nombre || coalesce(' · ' || nullif(p_nota, ''), ''),
      p_admin
    );
  end if;

  -- Cambio de fechas (solo el bono activo tiene fechas)
  if p_desde is not null or p_hasta is not null then
    if b.estado <> 'activo' then
      raise exception 'Las fechas solo se cambian en el bono activo';
    end if;
    nuevo_desde := coalesce(p_desde, b.activo_desde);
    nuevo_hasta := coalesce(p_hasta, b.caduca_en);
    if nuevo_desde is null or nuevo_hasta is null or nuevo_hasta <= nuevo_desde then
      raise exception 'La fecha de fin tiene que ser posterior a la de inicio';
    end if;

    update public.bonos set activo_desde = nuevo_desde, caduca_en = nuevo_hasta where id = b.id;

    insert into public.movimientos_bono (bono_id, tipo, dias, nota, creado_por)
    values (
      b.id, 'ajuste',
      round(extract(epoch from (nuevo_hasta - coalesce(b.caduca_en, nuevo_hasta))) / 86400)::int,
      'Fechas: ' || to_char(b.activo_desde at time zone 'Europe/Madrid', 'DD/MM/YYYY') || ' – ' || to_char(b.caduca_en at time zone 'Europe/Madrid', 'DD/MM/YYYY')
        || ' → ' || to_char(nuevo_desde at time zone 'Europe/Madrid', 'DD/MM/YYYY') || ' – ' || to_char(nuevo_hasta at time zone 'Europe/Madrid', 'DD/MM/YYYY')
        || coalesce(' · ' || nullif(p_nota, ''), ''),
      p_admin
    );
  end if;

  perform public.refrescar_bonos(b.user_id);
end;
$$;

-- 2) Quitar una tarifa.
--    p_ya = true: se anula ya el bono (y las cuotas en espera de ese servicio).
--    p_ya = false: el bono actual sigue hasta que caduque y solo se anulan las cuotas en espera (no se renueva).
--    p_anular_pago = true: además se anulan los pagos ya cobrados de ese bono (solo con p_ya).
--    Los pagos pendientes de los bonos anulados se anulan siempre.
create or replace function public.quitar_tarifa(
  p_bono uuid, p_ya boolean, p_anular_pago boolean, p_nota text, p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  fila record;
begin
  select * into b from public.bonos where id = p_bono for update;
  if not found then
    raise exception 'Bono no encontrado';
  end if;
  if b.estado = 'anulado' then
    raise exception 'El bono ya está anulado';
  end if;

  if p_ya or b.estado = 'en_cola' then
    perform public.anular_bono(p_bono, p_nota, p_admin);
    if p_anular_pago then
      update public.pagos
      set estado = 'anulado',
          nota = concat_ws(' · ', nullif(nota, ''), 'Anulado: ' || coalesce(nullif(p_nota, ''), 'tarifa quitada'))
      where bono_id = p_bono and estado = 'pagado';
    end if;
    -- Si se quita el bono actual, también las cuotas que esperaban detrás.
    if b.estado = 'activo' then
      for fila in
        select id from public.bonos
        where user_id = b.user_id and servicio = b.servicio and estado = 'en_cola' and id <> p_bono
      loop
        perform public.anular_bono(fila.id, p_nota, p_admin);
      end loop;
    end if;
  else
    for fila in
      select id from public.bonos
      where user_id = b.user_id and servicio = b.servicio and estado = 'en_cola' and id <> p_bono
    loop
      perform public.anular_bono(fila.id, p_nota, p_admin);
    end loop;
  end if;
end;
$$;

-- 3) Anular un pago (aunque ya esté cobrado), dejando el motivo escrito.
create or replace function public.anular_pago(p_pago uuid, p_nota text, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pagos
  set estado = 'anulado',
      nota = concat_ws(' · ', nullif(nota, ''), 'Anulado: ' || coalesce(nullif(p_nota, ''), 'sin motivo'))
  where id = p_pago and estado <> 'anulado';
  if not found then
    raise exception 'Pago no encontrado o ya anulado';
  end if;
end;
$$;

revoke all on function public.cambiar_bono(uuid, uuid, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.quitar_tarifa(uuid, boolean, boolean, text, uuid) from public, anon, authenticated;
revoke all on function public.anular_pago(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.cambiar_bono(uuid, uuid, timestamptz, timestamptz, text, uuid) to service_role;
grant execute on function public.quitar_tarifa(uuid, boolean, boolean, text, uuid) to service_role;
grant execute on function public.anular_pago(uuid, text, uuid) to service_role;
