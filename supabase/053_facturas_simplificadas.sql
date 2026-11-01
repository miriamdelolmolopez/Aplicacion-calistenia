-- Facturas simplificadas: a cada pago cobrado le toca un número correlativo por año (FS-2026-001, FS-2026-002…).
-- El número se guarda al cobrar, nunca se repite ni se salta, y se conserva aunque el pago se anule después.

create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null unique references public.pagos (id) on delete cascade,
  anio int not null,
  numero int not null,
  emitida_en timestamptz not null default now(),
  unique (anio, numero)
);

alter table public.facturas enable row level security;
revoke all on public.facturas from anon, authenticated;

-- Da número a un pago cobrado (si ya lo tiene, no hace nada). Los números se reparten de uno en uno.
create or replace function public.emitir_factura(p_pago uuid, p_cuando timestamptz default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cuando timestamptz := coalesce(p_cuando, now());
  ejercicio int := extract(year from (coalesce(p_cuando, now()) at time zone 'Europe/Madrid'))::int;
begin
  if exists (select 1 from public.facturas where pago_id = p_pago) then
    return;
  end if;
  perform pg_advisory_xact_lock(530001);
  insert into public.facturas (pago_id, anio, numero, emitida_en)
  values (
    p_pago,
    ejercicio,
    coalesce((select max(numero) from public.facturas where anio = ejercicio), 0) + 1,
    cuando
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
  end if;
  return new;
end;
$$;

drop trigger if exists pago_cobrado_factura on public.pagos;
create trigger pago_cobrado_factura
after insert or update of estado on public.pagos
for each row execute function public.pago_cobrado_factura();

-- Los pagos que ya estaban cobrados, en orden de fecha.
do $$
declare
  p record;
begin
  for p in
    select id, coalesce(pagado_en, creado_en) as cuando
    from public.pagos
    where estado = 'pagado'
    order by coalesce(pagado_en, creado_en), creado_en
  loop
    perform public.emitir_factura(p.id, p.cuando);
  end loop;
end;
$$;

revoke all on function public.emitir_factura(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.emitir_factura(uuid, timestamptz) to service_role;
