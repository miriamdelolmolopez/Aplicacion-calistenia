-- Tarifa futura: un bono con fecha de inicio en el futuro espera (en cola) y se activa solo ese día.
-- Así se puede dar de alta hoy la tarifa que empieza mañana, sin que se pueda usar antes ni pise a la actual.
-- No cambia ningún dato: solo redefine la función que elige qué bono pasa a estar activo.

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
    -- Un bono sin caducidad cede su turno a uno que sí caduca (si ya puede empezar).
    if activo.sin_caducidad and exists (
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
          not t.requiere_pago
          or exists (select 1 from public.pagos p where p.bono_id = b.id and p.estado = 'pagado')
        )
    ) then
      update public.bonos set estado = 'en_cola' where id = activo.id;
      insert into public.movimientos_bono (bono_id, tipo, nota)
      values (activo.id, 'ajuste', 'En pausa: pasa antes una tarifa con fecha de fin');
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
  order by b.sin_caducidad, b.creado_en
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
