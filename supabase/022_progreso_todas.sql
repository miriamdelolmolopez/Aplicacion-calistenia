-- Mi progreso para todas las alumnas (clases y/o entrenos online).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: solo vuelve a definir dos funciones.
--
-- Actividad = clases a las que ha ido (reserva "reservada" de una clase ya pasada y no cancelada)
--           + entrenos online terminados.
-- Nivel de la planta: 1 (0) · 2 (5) · 3 (15) · 4 (30) · 5 (60) · 6 (100) de actividad.
-- Marchita: 0 no · 1 más de 5 días sin actividad · 2 más de 14 días.
-- Racha: semanas seguidas (lunes a domingo, Madrid) con al menos tantas actividades como el
-- objetivo semanal: el "entrenos por semana" de la rutina publicada o, si no hay rutina, 1.
-- La semana en curso no rompe la racha; si ya se cumple, suma.

create or replace function public.progreso_calculo(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  zona constant text := 'Europe/Madrid';
  n_entrenos int;
  n_clases int;
  total int;
  ult_entreno timestamptz;
  ult_clase timestamptz;
  ultimo timestamptz;
  dias int;
  marchita int := 0;
  nivel int;
  siguiente int;
  objetivo_sem int;
  de_rutina boolean := false;
  semana_actual date;
  semana date;
  n int;
  n_actual int := 0;
  racha int := 0;
  i int;
  mes_entrenos int;
  mes_clases int;
  mes_seg bigint;
  clases_mes jsonb;
begin
  select count(*), max(terminado_en) into n_entrenos, ult_entreno
  from public.entrenos where user_id = p_user and estado = 'terminado';

  select count(*), max(s.empieza_en) into n_clases, ult_clase
  from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
  where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now();

  total := n_entrenos + n_clases;
  ultimo := greatest(ult_entreno, ult_clase);

  nivel := case
    when total >= 100 then 6
    when total >= 60 then 5
    when total >= 30 then 4
    when total >= 15 then 3
    when total >= 5 then 2
    else 1 end;
  siguiente := case nivel when 1 then 5 when 2 then 15 when 3 then 30 when 4 then 60 when 5 then 100 else null end;

  if ultimo is not null then
    dias := (now() at time zone zona)::date - (ultimo at time zone zona)::date;
    marchita := case when dias > 14 then 2 when dias > 5 then 1 else 0 end;
  end if;

  select coalesce(r.entrenos_semana, (select count(*)::int from public.rutina_sesiones s where s.rutina_id = r.id))
  into objetivo_sem
  from public.rutinas r
  where r.user_id = p_user and r.estado = 'publicada'
  limit 1;
  de_rutina := objetivo_sem is not null and objetivo_sem > 0;
  if not de_rutina then
    objetivo_sem := 1;
  end if;

  semana_actual := date_trunc('week', now() at time zone zona)::date;

  select
    (select count(*) from public.entrenos
      where user_id = p_user and estado = 'terminado'
        and (terminado_en at time zone zona)::date >= semana_actual)
    + (select count(*) from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
        where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
          and (s.empieza_en at time zone zona)::date >= semana_actual)
  into n_actual;

  for i in 0..519 loop
    semana := semana_actual - i * 7;
    select
      (select count(*) from public.entrenos
        where user_id = p_user and estado = 'terminado'
          and (terminado_en at time zone zona)::date >= semana
          and (terminado_en at time zone zona)::date < semana + 7)
      + (select count(*) from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
          where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
            and (s.empieza_en at time zone zona)::date >= semana
            and (s.empieza_en at time zone zona)::date < semana + 7)
    into n;
    if n >= objetivo_sem then
      racha := racha + 1;
    elsif i > 0 then
      exit;
    end if;
  end loop;

  select count(*), coalesce(sum(duracion_seg), 0) into mes_entrenos, mes_seg
  from public.entrenos
  where user_id = p_user and estado = 'terminado'
    and (terminado_en at time zone zona) >= date_trunc('month', now() at time zone zona);

  select count(*)::int into mes_clases
  from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
  where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
    and (s.empieza_en at time zone zona) >= date_trunc('month', now() at time zone zona);

  select coalesce(jsonb_agg(jsonb_build_object('mes', m.mes, 'clases', m.n) order by m.mes), '[]'::jsonb) into clases_mes
  from (
    select to_char(g.mes, 'YYYY-MM') as mes,
           (select count(*) from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
              where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
                and date_trunc('month', s.empieza_en at time zone zona) = g.mes)::int as n
    from generate_series(
      date_trunc('month', now() at time zone zona) - interval '5 months',
      date_trunc('month', now() at time zone zona),
      interval '1 month'
    ) as g (mes)
  ) m;

  return jsonb_build_object(
    'total', total,
    'entrenos_total', n_entrenos,
    'clases_total', n_clases,
    'nivel', nivel,
    'siguiente_nivel_en', case when siguiente is null then null else siguiente - total end,
    'dias_sin_entrenar', dias,
    'marchita', marchita,
    'racha_semanas', racha,
    'objetivo_semana', objetivo_sem,
    'objetivo_de_rutina', de_rutina,
    'entrenos_esta_semana', n_actual,
    'mes_entrenos', mes_entrenos,
    'mes_clases', mes_clases,
    'mes_segundos', mes_seg,
    'clases_por_mes', clases_mes
  );
end;
$$;

-- Cualquier persona con sesión ve el suyo (antes solo con plan online).
create or replace function public.mi_progreso()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  return public.progreso_calculo(auth.uid());
end;
$$;
