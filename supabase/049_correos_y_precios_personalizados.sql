-- Fase 5: «No enviarle correos» por persona, precio fijo personalizado y un precio opcional al crear un bono.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No cambia ni borra ningún dato existente: añade una columna, una tabla y amplía una función con un dato opcional.

-- 1) «No comunicarse por email»: si está activado, la app no le manda ningún correo a esa persona.
alter table public.profiles add column if not exists sin_correos boolean not null default false;

-- 2) Precio fijo personalizado: el precio de una tarifa para una persona concreta.
create table if not exists public.precios_personalizados (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo_bono_id uuid not null references public.tipos_bono (id) on delete cascade,
  precio_centimos int not null check (precio_centimos >= 0),
  actualizado_en timestamptz not null default now(),
  primary key (user_id, tipo_bono_id)
);
alter table public.precios_personalizados enable row level security;
revoke all on public.precios_personalizados from anon, authenticated;

-- 3) Crear un bono, con un precio opcional (p_precio). Si no se indica, se usa el precio de la tarifa, como hasta ahora.
drop function if exists public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid);

create or replace function public.crear_bono(
  p_user uuid,
  p_tipo uuid,
  p_metodo text,
  p_pagado boolean,
  p_nota text,
  p_admin uuid,
  p_descuento uuid default null,
  p_precio int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo record;
  d record;
  nuevo uuid;
  segundo uuid;
  precio int;
  rebaja int := 0;
begin
  select * into tipo from public.tipos_bono where id = p_tipo and activo;
  if not found then
    raise exception 'Tipo de bono no válido';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'La persona debe ser alumno';
  end if;
  precio := coalesce(p_precio, tipo.precio_centimos);
  if precio < 0 then
    raise exception 'El precio no es válido';
  end if;

  if p_descuento is not null then
    select * into d from public.descuentos where id = p_descuento for update;
    if not found or not d.activo then
      raise exception 'Descuento no válido';
    end if;
    if d.caduca_en is not null and d.caduca_en < (now() at time zone 'Europe/Madrid')::date then
      raise exception 'El descuento ha caducado';
    end if;
    if d.usos_max is not null and (
      select count(*) from public.pagos where descuento_id = d.id and estado <> 'anulado'
    ) >= d.usos_max then
      raise exception 'El descuento ya se ha usado el máximo de veces';
    end if;
    rebaja := case d.tipo
      when 'porcentaje' then round(precio * d.valor / 100.0)::int
      else least(d.valor, precio)
    end;
  end if;

  insert into public.bonos (user_id, tipo_bono_id, servicio, clases_total,
                            clases_restantes, validez_dias, nota)
  values (p_user, tipo.id, tipo.servicio, tipo.clases, tipo.clases,
          tipo.validez_dias, nullif(p_nota, ''))
  returning id into nuevo;

  insert into public.pagos (user_id, bono_id, importe_centimos, importe_original_centimos,
                            descuento_centimos, descuento_id, metodo, estado, pagado_en, nota)
  values (p_user, nuevo, precio - rebaja, precio, rebaja, p_descuento, p_metodo,
          case when p_pagado then 'pagado' else 'pendiente' end,
          case when p_pagado then now() else null end,
          nullif(p_nota, ''));

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (nuevo, 'alta', tipo.clases,
          tipo.nombre || case when rebaja > 0 then ' (con descuento)' else '' end, p_admin);

  -- Combo: además del primer bono, se crea el segundo (otro servicio) con su propia validez (o la misma que el primero) y el mismo pago.
  if tipo.servicio2 is not null then
    insert into public.bonos (user_id, tipo_bono_id, servicio, clases_total,
                              clases_restantes, validez_dias, nota)
    values (p_user, tipo.id, tipo.servicio2, tipo.clases2, tipo.clases2,
            coalesce(tipo.validez_dias2, tipo.validez_dias), nullif(p_nota, ''))
    returning id into segundo;

    insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
    values (segundo, 'alta', tipo.clases2, tipo.nombre || ' (combo)', p_admin);
  end if;

  perform public.refrescar_bonos(p_user);
  return nuevo;
end;
$$;

revoke all on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid, int) to service_role;
