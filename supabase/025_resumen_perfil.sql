-- Números de la cabecera del Perfil.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: solo crea una función.
--
-- dias_activo: días seguidos con un bono, tarifa o mes de entrenamiento en marcha.
--   Cada bono cubre desde que se activó hasta que caduca (o hasta hoy si sigue vigente).
--   Si entre un bono y el siguiente pasan 7 días o menos, se sigue sumando.
--   Si pasan más de 7 días sin cobertura, vuelve a 0.
-- reservas_tarifa: reservas vivas (no canceladas) hechas con sus bonos activos de clases.
-- sesiones_semana / objetivo_semana: entrenos online terminados esta semana (lunes a domingo,
--   Madrid) y las que toca hacer (las de su rutina publicada, o 1 si no tiene rutina).

create or replace function public.resumen_perfil()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  zona constant text := 'Europe/Madrid';
  uid uuid := auth.uid();
  b record;
  ini timestamptz;
  fin timestamptz;
  cadena_ini timestamptz;
  cadena_fin timestamptz;
  dias int := 0;
  n_reservas int;
  objetivo int;
  hechas int;
  semana_actual date;
begin
  if uid is null then
    return null;
  end if;

  for b in
    select activo_desde, caduca_en
    from public.bonos
    where user_id = uid
      and estado in ('activo', 'agotado', 'caducado')
      and activo_desde is not null
    order by activo_desde
  loop
    ini := b.activo_desde;
    fin := least(coalesce(b.caduca_en, now()), now());
    if fin < ini then
      continue;
    end if;
    if cadena_ini is null or ini > cadena_fin + interval '7 days' then
      cadena_ini := ini;
      cadena_fin := fin;
    else
      cadena_fin := greatest(cadena_fin, fin);
    end if;
  end loop;

  if cadena_ini is not null and now() <= cadena_fin + interval '7 days' then
    dias := (least(now(), cadena_fin) at time zone zona)::date - (cadena_ini at time zone zona)::date + 1;
  end if;

  select count(*)::int into n_reservas
  from public.reservas r
  join public.bonos bo on bo.id = r.bono_id and bo.estado = 'activo'
  where r.user_id = uid and r.estado = 'reservada';

  select coalesce(r.entrenos_semana, (select count(*)::int from public.rutina_sesiones s where s.rutina_id = r.id))
  into objetivo
  from public.rutinas r
  where r.user_id = uid and r.estado = 'publicada'
  limit 1;
  if objetivo is null or objetivo < 1 then
    objetivo := 1;
  end if;

  semana_actual := date_trunc('week', now() at time zone zona)::date;
  select count(*)::int into hechas
  from public.entrenos
  where user_id = uid and estado = 'terminado'
    and (terminado_en at time zone zona)::date >= semana_actual;

  return jsonb_build_object(
    'dias_activo', dias,
    'reservas_tarifa', n_reservas,
    'sesiones_semana', hechas,
    'objetivo_semana', objetivo
  );
end;
$$;

revoke all on function public.resumen_perfil() from public, anon;
grant execute on function public.resumen_perfil() to authenticated;
