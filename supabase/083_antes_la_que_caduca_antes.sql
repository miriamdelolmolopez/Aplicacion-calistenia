-- 083: se usa primero la tarifa que caduca antes.
-- Caso típico: una clase cancelada vuelve a una tarifa vieja (que caduca pronto) mientras la
-- tarifa nueva ya está en marcha. Hasta ahora la vieja se quedaba esperando y se perdía al caducar.
-- Ahora la tarifa activa cede su turno a otra en espera que caduca ANTES y ya puede usarse.
-- Lo demás no cambia: los bonos sin caducidad siguen pasando los últimos y las fechas de inicio futuras esperan.

create or replace function public.activar_siguiente(p_user uuid, p_servicio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  activo record;
  siguiente record;
begin
  select * into activo
  from public.bonos
  where user_id = p_user and servicio = p_servicio and estado = 'activo'
  limit 1;

  if found then
    -- La activa cede su turno a una en espera con fecha de fin si: (a) la activa no caduca, o
    -- (b) la que espera caduca antes que la activa. Solo si la que espera ya puede empezar.
    if exists (
      select 1
      from public.bonos b
      join public.tipos_bono t on t.id = b.tipo_bono_id
      where b.user_id = p_user
        and b.servicio = p_servicio
        and b.estado = 'en_cola'
        and not b.sin_caducidad
        and b.clases_restantes > 0
        and (b.activo_desde is null or b.activo_desde <= now())
        and (b.caduca_en is null or b.caduca_en > now())
        and (
          activo.sin_caducidad
          or (b.caduca_en is not null and activo.caduca_en is not null and b.caduca_en < activo.caduca_en)
        )
        and (
          not t.requiere_pago
          or exists (select 1 from public.pagos p where p.bono_id = b.id and p.estado = 'pagado')
        )
    ) then
      update public.bonos set estado = 'en_cola' where id = activo.id;
      insert into public.movimientos_bono (bono_id, tipo, nota)
      values (activo.id, 'ajuste', 'En pausa: pasa antes una tarifa que caduca antes');
    else
      return;
    end if;
  end if;

  select b.* into siguiente
  from public.bonos b
  join public.tipos_bono t on t.id = b.tipo_bono_id
  where b.user_id = p_user
    and b.servicio = p_servicio
    and b.estado = 'en_cola'
    and b.clases_restantes > 0
    and (b.activo_desde is null or b.activo_desde <= now())
    and (b.caduca_en is null or b.caduca_en > now())
    and (
      not t.requiere_pago
      or exists (
        select 1 from public.pagos p
        where p.bono_id = b.id and p.estado = 'pagado'
      )
    )
  order by b.sin_caducidad, b.caduca_en nulls last, b.creado_en
  limit 1;

  if not found then
    return;
  end if;

  update public.bonos
  set estado = 'activo',
      activo_desde = coalesce(activo_desde, now()),
      caduca_en = case
        when siguiente.sin_caducidad then null
        else coalesce(caduca_en, now() + make_interval(days => siguiente.validez_dias))
      end
  where id = siguiente.id;

  insert into public.movimientos_bono (bono_id, tipo, nota)
  values (siguiente.id, 'activacion', 'Empieza a contar');
end;
$$;
revoke all on function public.activar_siguiente(uuid, text) from public, anon, authenticated;
grant execute on function public.activar_siguiente(uuid, text) to service_role;
