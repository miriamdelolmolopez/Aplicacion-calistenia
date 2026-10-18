-- Bloque 4B · Descuentos (los aplica Miriam al dar de alta un bono)
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. CATÁLOGO DE DESCUENTOS ----------------------------------------------------------
-- tipo 'porcentaje': valor = 1..100 · tipo 'euros': valor = céntimos (1000 = 10 €)
create table if not exists public.descuentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  tipo text not null check (tipo in ('porcentaje', 'euros')),
  valor int not null check (valor > 0),
  activo boolean not null default true,
  caduca_en date,
  usos_max int check (usos_max is null or usos_max > 0),
  creado_en timestamptz not null default now(),
  check (tipo <> 'porcentaje' or valor <= 100)
);
create unique index if not exists descuentos_nombre_unico on public.descuentos (lower(nombre));

-- 2. EL PAGO GUARDA PRECIO ORIGINAL, DESCUENTO Y TOTAL ------------------------------------
alter table public.pagos
  add column if not exists descuento_id uuid references public.descuentos (id) on delete set null,
  add column if not exists importe_original_centimos int,
  add column if not exists descuento_centimos int not null default 0 check (descuento_centimos >= 0);

-- 3. CREAR BONO, AHORA CON DESCUENTO OPCIONAL ---------------------------------------------
drop function if exists public.crear_bono(uuid, uuid, text, boolean, text, uuid);
create function public.crear_bono(
  p_user uuid,
  p_tipo uuid,
  p_metodo text,
  p_pagado boolean,
  p_nota text,
  p_admin uuid,
  p_descuento uuid default null
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
  precio := tipo.precio_centimos;

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

  perform public.refrescar_bonos(p_user);
  return nuevo;
end;
$$;

revoke all on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crear_bono(uuid, uuid, text, boolean, text, uuid, uuid) to service_role;

-- 4. SEGURIDAD: solo Miriam ve y cambia los descuentos (la alumna solo ve el importe de SU pago) ----
alter table public.descuentos enable row level security;
revoke all on public.descuentos from anon, authenticated;
grant select on public.descuentos to authenticated;

drop policy if exists descuentos_ver on public.descuentos;
create policy descuentos_ver on public.descuentos
  for select to authenticated using ((select public.es_admin()));
