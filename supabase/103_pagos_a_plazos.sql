-- 103: pagos a plazos (cuotas), con fecha de vencimiento, avisos y margen antes de pausar la tarifa.
-- Pégalo ENTERO en el editor SQL de Supabase de CalisCoach y pulsa Run. Se puede repetir sin problema. No borra ni cambia ningún pago que ya exista.

-- 1. Cada pago puede ser una cuota: con fecha de vencimiento y su número («cuota 2 de 3») ---------------------------------
alter table public.pagos
  add column if not exists vence_en date,
  add column if not exists cuota_n int check (cuota_n is null or cuota_n >= 1),
  add column if not exists cuotas_total int check (cuotas_total is null or cuotas_total >= 1);
create index if not exists pagos_vencimiento on public.pagos (vence_en) where estado = 'pendiente' and vence_en is not null;

-- 2. Ajustes que puedes cambiar desde Pagos: margen tras el vencimiento y días de aviso antes -------------------------------
insert into public.ajustes (clave, valor) values
  ('cuotas_margen_dias', '7'),
  ('cuotas_aviso_dias', '3')
on conflict (clave) do nothing;

-- 3. El registro de avisos acepta los tipos nuevos (los de antes se mantienen) -------------------------------------------
alter table public.avisos_enviados drop constraint if exists avisos_enviados_tipo_check;
alter table public.avisos_enviados
  add constraint avisos_enviados_tipo_check
  check (tipo in (
    'bono_caduca', 'minimo_clase', 'prueba_recordatorio', 'prueba_despues', 'cumple',
    'echamos_menos', 'bienvenida', 'recordatorio_clase', 'bono_agotado', 'aniversario',
    'cuota_aviso', 'cuota_vence', 'cuota_pausa'
  ));

-- 4. Días de margen (por defecto 7) y si una tarifa tiene alguna cuota vencida pasado ese margen --------------------------
create or replace function public.margen_cuotas()
returns int
language sql
stable
set search_path = public
as $$
  select coalesce((select nullif(valor, '')::int from public.ajustes where clave = 'cuotas_margen_dias'), 7);
$$;

create or replace function public.cuota_vencida(p_bono uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.pagos p
    where p.bono_id = p_bono
      and p.estado = 'pendiente'
      and p.vence_en is not null
      and p.vence_en + public.margen_cuotas() < (now() at time zone 'Europe/Madrid')::date
  );
$$;
revoke all on function public.margen_cuotas() from public, anon, authenticated;
revoke all on function public.cuota_vencida(uuid) from public, anon, authenticated;
grant execute on function public.margen_cuotas() to service_role;
grant execute on function public.cuota_vencida(uuid) to service_role;

-- 5. Una tarifa con una cuota vencida (pasado el margen) no se activa, igual que una que espera su pago -------------------
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
        and not public.cuota_vencida(b.id)
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
    and not public.cuota_vencida(b.id)
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

-- 6. Pausa las tarifas en marcha que tienen una cuota vencida pasado el margen (la llama el aviso diario) -----------------
-- Al cobrar la cuota, la tarifa vuelve a activarse sola. Devuelve a quién se ha pausado.
create or replace function public.pausar_bonos_con_cuota_vencida()
returns table (bono_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  for fila in
    select b.id, b.user_id from public.bonos b
    where b.estado = 'activo' and public.cuota_vencida(b.id)
  loop
    update public.bonos set estado = 'en_cola' where id = fila.id;
    insert into public.movimientos_bono (bono_id, tipo, nota)
    values (fila.id, 'ajuste', 'En pausa: cuota vencida sin pagar');
    bono_id := fila.id;
    user_id := fila.user_id;
    return next;
  end loop;
end;
$$;
revoke all on function public.pausar_bonos_con_cuota_vencida() from public, anon, authenticated;
grant execute on function public.pausar_bonos_con_cuota_vencida() to service_role;

notify pgrst, 'reload schema';
