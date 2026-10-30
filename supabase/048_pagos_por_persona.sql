-- Pagos por persona: a qué mes corresponde cada pago y cobrar un pago pendiente con la fecha, hora y forma que se elijan.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- Solo AÑADE una columna y una función. No cambia ni borra ningún dato existente.

-- 1) Mes al que corresponde el pago (AAAA-MM). Los pagos que ya existen se quedan sin rellenar.
alter table public.pagos add column if not exists periodo text;
alter table public.pagos drop constraint if exists pagos_periodo_formato;
alter table public.pagos
  add constraint pagos_periodo_formato check (periodo is null or periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

-- 2) Cobrar un pago pendiente con fecha, hora, forma de pago y mes elegidos.
create or replace function public.cobrar_pago(
  p_pago uuid, p_pagado_en timestamptz, p_metodo text, p_periodo text, p_nota text, p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  update public.pagos
  set estado = 'pagado',
      pagado_en = coalesce(p_pagado_en, now()),
      metodo = coalesce(nullif(p_metodo, ''), metodo),
      periodo = coalesce(nullif(p_periodo, ''), periodo),
      nota = concat_ws(' · ', nullif(nota, ''), nullif(p_nota, ''))
  where id = p_pago and estado = 'pendiente'
  returning * into fila;

  if not found then
    raise exception 'El pago no existe o ya no está pendiente';
  end if;

  if fila.bono_id is not null then
    insert into public.movimientos_bono (bono_id, tipo, nota, creado_por)
    values (fila.bono_id, 'ajuste', 'Pago cobrado', p_admin);
  end if;

  if fila.user_id is not null then
    perform public.refrescar_bonos(fila.user_id);
  end if;
end;
$$;

revoke all on function public.cobrar_pago(uuid, timestamptz, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.cobrar_pago(uuid, timestamptz, text, text, text, uuid) to service_role;
