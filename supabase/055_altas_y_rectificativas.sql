-- 1) Las altas que hace Miriam pasan el registro cerrado con una clave interna que solo conoce el servidor.
create table if not exists public.claves_internas (
  clave text primary key,
  valor text not null
);
alter table public.claves_internas enable row level security;
revoke all on public.claves_internas from anon, authenticated;

create or replace function public.bloquear_registro_cerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  abierto text := coalesce((select valor from public.ajustes where clave = 'registro_abierto'), 'true');
  activa text := (select valor from public.ajustes where clave = 'prueba_activa');
  codigo text := (select valor from public.ajustes where clave = 'prueba_codigo');
  clave_alta text := (select valor from public.claves_internas where clave = 'alta');
begin
  if abierto = 'true' then
    return new;
  end if;
  -- Altas hechas por Miriam desde Administración.
  if clave_alta is not null and coalesce(new.raw_user_meta_data ->> 'alta', '') = clave_alta then
    return new;
  end if;
  -- Google: lo comprueba la propia app al entrar.
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    return new;
  end if;
  -- Quien llega con el código vigente del link de prueba.
  if activa = 'true' and coalesce(codigo, '') <> ''
     and upper(coalesce(new.raw_user_meta_data ->> 'codigo', '')) = upper(codigo) then
    return new;
  end if;
  raise exception 'El registro está cerrado';
end;
$$;

-- 2) Facturas rectificativas: al anular un pago ya facturado sale otra factura, con su propio número
--    (FSR-2026-001…), que anula la original. La original conserva su número.
alter table public.facturas add column if not exists tipo text not null default 'normal';
alter table public.facturas drop constraint if exists facturas_tipo_check;
alter table public.facturas add constraint facturas_tipo_check check (tipo in ('normal', 'rectificativa'));
alter table public.facturas drop constraint if exists facturas_pago_id_key;
alter table public.facturas drop constraint if exists facturas_anio_numero_key;
create unique index if not exists facturas_pago_tipo on public.facturas (pago_id, tipo);
create unique index if not exists facturas_serie_numero on public.facturas (tipo, anio, numero);

drop function if exists public.emitir_factura(uuid, timestamptz);
create or replace function public.emitir_factura(p_pago uuid, p_cuando timestamptz default null, p_tipo text default 'normal')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cuando timestamptz := coalesce(p_cuando, now());
  ejercicio int := extract(year from (coalesce(p_cuando, now()) at time zone 'Europe/Madrid'))::int;
begin
  if exists (select 1 from public.facturas where pago_id = p_pago and tipo = p_tipo) then
    return;
  end if;
  perform pg_advisory_xact_lock(530001);
  insert into public.facturas (pago_id, anio, numero, emitida_en, tipo)
  values (
    p_pago,
    ejercicio,
    coalesce((select max(numero) from public.facturas where anio = ejercicio and tipo = p_tipo), 0) + 1,
    cuando,
    p_tipo
  );
end;
$$;

create or replace function public.pago_cobrado_factura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'pagado' and (tg_op = 'INSERT' or old.estado is distinct from 'pagado') then
    perform public.emitir_factura(new.id);
  elsif tg_op = 'UPDATE' and new.estado = 'anulado' and old.estado = 'pagado' then
    -- Solo si ya tenía factura: se rectifica con otra.
    if exists (select 1 from public.facturas where pago_id = new.id and tipo = 'normal') then
      perform public.emitir_factura(new.id, null, 'rectificativa');
    end if;
  end if;
  return new;
end;
$$;

-- Los pagos que ya estaban anulados después de cobrarse (y facturarse) también reciben su rectificativa.
do $$
declare
  p record;
begin
  for p in
    select pg.id from public.pagos pg
    join public.facturas f on f.pago_id = pg.id and f.tipo = 'normal'
    where pg.estado = 'anulado'
    order by f.emitida_en
  loop
    perform public.emitir_factura(p.id, null, 'rectificativa');
  end loop;
end;
$$;

revoke all on function public.emitir_factura(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.emitir_factura(uuid, timestamptz, text) to service_role;
