-- «Borrar» una reserva cancelada fuera de plazo: devuelve la clase a la alumna (solo lo hace la administradora).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

create or replace function public.devolver_reserva_cancelada(p_reserva uuid, p_admin uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  devuelta boolean := false;
begin
  select * into r from public.reservas where id = p_reserva for update;
  if not found then
    raise exception 'Reserva no encontrada';
  end if;
  if r.estado <> 'cancelada_tarde' or r.clase_devuelta then
    raise exception 'Esa reserva no se puede devolver';
  end if;

  if r.es_prueba then
    -- Recupera su clase de prueba.
    update public.reservas set estado = 'cancelada', clase_devuelta = true where id = r.id;
    return true;
  end if;

  if r.bono_id is not null then
    devuelta := public.devolver_clase_a_bono(r.bono_id, 1, 'Reserva borrada por la administradora', p_admin);
  end if;
  update public.reservas set estado = 'cancelada', clase_devuelta = devuelta where id = r.id;
  return devuelta;
end;
$$;

revoke all on function public.devolver_reserva_cancelada(uuid, uuid) from public, anon, authenticated;
grant execute on function public.devolver_reserva_cancelada(uuid, uuid) to service_role;
