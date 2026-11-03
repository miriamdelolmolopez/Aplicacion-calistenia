-- Orden de uso de los bonos: primero los que caducan y después los que no (los regalos «sin fecha de fin»).
--  · bonos.sin_caducidad marca esos bonos.
--  · Al elegir cuál se usa a continuación, pasan antes los que caducan.
--  · Si el bono que se está usando es uno sin caducidad y llega uno con fecha (por ejemplo, una tarifa comprada),
--    el sin caducidad se pone en pausa (conserva sus clases) y vuelve cuando termine el otro.
--  · Un bono sin caducidad que se quedó sin clases vuelve a activarse si se le devuelve una clase.
-- No borra ni cambia ningún dato: solo añade una columna y redefine dos funciones.

alter table public.bonos add column if not exists sin_caducidad boolean not null default false;

-- Los regalos sin fecha de fin que ya existen.
update public.bonos
set sin_caducidad = true
where nota = 'Regalo'
  and caduca_en is null
  and tipo_bono_id in (select id from public.tipos_bono where nombre like 'Regalo · %');

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
  where id = p_bono and estado in ('agotado', 'caducado') and (sin_caducidad or caduca_en > now());

  perform public.refrescar_bonos(b.user_id);
  return true;
end;
$$;

revoke all on function public.activar_siguiente(uuid, text) from public, anon, authenticated;
revoke all on function public.devolver_clase_a_bono(uuid, int, text, uuid) from public, anon, authenticated;
grant execute on function public.activar_siguiente(uuid, text) to service_role;
grant execute on function public.devolver_clase_a_bono(uuid, int, text, uuid) to service_role;
