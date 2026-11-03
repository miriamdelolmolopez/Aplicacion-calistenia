-- Poder cambiar la tarifa y las fechas de un bono que ya ha caducado o se ha agotado.
-- Si con las nuevas fechas ya no está caducado y le quedan clases, vuelve a estar activo.
-- No borra ni cambia ningún dato existente: solo redefine la función.

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
  if b.estado not in ('activo', 'en_cola', 'caducado', 'agotado') then
    raise exception 'Solo se pueden cambiar bonos activos, en espera, caducados o agotados';
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
    if b.estado not in ('activo', 'caducado', 'agotado') then
      raise exception 'Las fechas solo se cambian en un bono activo, caducado o agotado';
    end if;
    nuevo_desde := coalesce(p_desde, b.activo_desde);
    nuevo_hasta := coalesce(p_hasta, b.caduca_en);
    if nuevo_desde is null or nuevo_hasta is null or nuevo_hasta <= nuevo_desde then
      raise exception 'La fecha de fin tiene que ser posterior a la de inicio';
    end if;

    update public.bonos set activo_desde = nuevo_desde, caduca_en = nuevo_hasta where id = b.id;

    -- Un bono caducado o agotado vuelve a estar activo si, con las nuevas fechas, todavía no ha caducado y le quedan clases.
    if b.estado in ('caducado', 'agotado') and nuevo_hasta > now() and (select clases_restantes from public.bonos where id = b.id) > 0 then
      if exists (
        select 1 from public.bonos o
        where o.user_id = b.user_id and o.servicio = (select servicio from public.bonos where id = b.id) and o.estado = 'activo' and o.id <> b.id
      ) then
        raise exception 'Ya tiene un bono activo de ese servicio';
      end if;
      update public.bonos set estado = 'activo' where id = b.id;
      insert into public.movimientos_bono (bono_id, tipo, nota, creado_por)
      values (b.id, 'ajuste', 'Reactivado al cambiar las fechas', p_admin);
    end if;

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

revoke all on function public.cambiar_bono(uuid, uuid, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.cambiar_bono(uuid, uuid, timestamptz, timestamptz, text, uuid) to service_role;
