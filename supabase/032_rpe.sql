-- RPE (esfuerzo percibido, de 1 a 10) opcional en cada serie del entreno.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

alter table public.entreno_series add column if not exists rpe int
  check (rpe is null or rpe between 1 and 10);

-- Se sustituye guardar_serie por una versión que también guarda el RPE.
drop function if exists public.guardar_serie(uuid, uuid, int, int, numeric, int, text, boolean);

create or replace function public.guardar_serie(
  p_user uuid, p_serie uuid,
  p_reps int, p_segundos int, p_peso numeric, p_distancia int, p_detalle text,
  p_completada boolean, p_rpe int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  encontrada uuid;
begin
  update public.entreno_series s
  set reps = p_reps,
      segundos = p_segundos,
      peso_kg = p_peso,
      distancia_m = p_distancia,
      detalle = nullif(trim(p_detalle), ''),
      rpe = case when p_rpe between 1 and 10 then p_rpe else null end,
      completada = coalesce(p_completada, false),
      completada_en = case
        when coalesce(p_completada, false) then coalesce(s.completada_en, now())
        else null
      end
  from public.entrenos e
  where s.id = p_serie
    and e.id = s.entreno_id
    and e.user_id = p_user
    and e.estado = 'en_curso'
  returning s.id into encontrada;

  if encontrada is null then
    raise exception 'Serie no encontrada o entreno ya terminado';
  end if;
end;
$$;

revoke all on function public.guardar_serie(uuid, uuid, int, int, numeric, int, text, boolean, int) from public, anon, authenticated;
grant execute on function public.guardar_serie(uuid, uuid, int, int, numeric, int, text, boolean, int) to service_role;
