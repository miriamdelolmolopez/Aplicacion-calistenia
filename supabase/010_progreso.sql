-- Fase 5 · Parte D: progreso (racha, nivel de la planta) y objetivos
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. OBJETIVOS (los pone solo Miriam) ----------------------------------------------
create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ejercicio_id uuid references public.ejercicios (id) on delete set null,
  nombre_ejercicio text not null check (char_length(nombre_ejercicio) between 1 and 120),
  campo text not null check (campo in ('reps', 'segundos', 'peso_kg', 'distancia_m')),
  meta numeric(8, 2) not null check (meta > 0),
  creado_en timestamptz not null default now()
);
create index if not exists objetivos_user on public.objetivos (user_id);

alter table public.objetivos enable row level security;
revoke all on public.objetivos from anon, authenticated;
grant select on public.objetivos to authenticated;

drop policy if exists objetivos_ver on public.objetivos;
create policy objetivos_ver on public.objetivos
  for select to authenticated
  using (
    (select public.es_admin())
    or (user_id = (select auth.uid()) and (select public.mi_plan_online()))
  );

-- 2. CÁLCULO DEL PROGRESO ------------------------------------------------------------
-- Nivel de la planta: 1 (0) · 2 (5) · 3 (15) · 4 (30) · 5 (60) · 6 (100) entrenos terminados.
-- Marchita: 0 no · 1 más de 5 días sin terminar un entreno · 2 más de 14 días.
-- Racha: semanas seguidas (lunes a domingo, hora de Madrid) con al menos tantos entrenos
-- terminados como "entrenos por semana" de la rutina publicada (o su número de sesiones).
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
  total int;
  ultimo timestamptz;
  dias int;
  marchita int := 0;
  nivel int;
  siguiente int;
  objetivo_sem int;
  semana_actual date;
  semana date;
  n int;
  n_actual int := 0;
  racha int := 0;
  i int;
  mes_entrenos int;
  mes_seg bigint;
begin
  select count(*), max(terminado_en) into total, ultimo
  from public.entrenos where user_id = p_user and estado = 'terminado';

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

  semana_actual := date_trunc('week', now() at time zone zona)::date;

  select count(*) into n_actual
  from public.entrenos
  where user_id = p_user and estado = 'terminado'
    and (terminado_en at time zone zona)::date >= semana_actual;

  if objetivo_sem is not null and objetivo_sem > 0 then
    for i in 0..519 loop
      semana := semana_actual - i * 7;
      select count(*) into n
      from public.entrenos
      where user_id = p_user and estado = 'terminado'
        and (terminado_en at time zone zona)::date >= semana
        and (terminado_en at time zone zona)::date < semana + 7;
      if n >= objetivo_sem then
        racha := racha + 1;
      elsif i > 0 then
        exit;
      end if;
    end loop;
  end if;

  select count(*), coalesce(sum(duracion_seg), 0) into mes_entrenos, mes_seg
  from public.entrenos
  where user_id = p_user and estado = 'terminado'
    and (terminado_en at time zone zona) >= date_trunc('month', now() at time zone zona);

  return jsonb_build_object(
    'total', total,
    'nivel', nivel,
    'siguiente_nivel_en', case when siguiente is null then null else siguiente - total end,
    'dias_sin_entrenar', dias,
    'marchita', marchita,
    'racha_semanas', racha,
    'objetivo_semana', objetivo_sem,
    'entrenos_esta_semana', n_actual,
    'mes_entrenos', mes_entrenos,
    'mes_segundos', mes_seg
  );
end;
$$;

-- La alumna ve el suyo (solo con plan online activo).
create or replace function public.mi_progreso()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.mi_plan_online() then
    return null;
  end if;
  return public.progreso_calculo(auth.uid());
end;
$$;

-- Miriam ve el de cualquier alumna.
create or replace function public.progreso_alumno(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede ver esto';
  end if;
  return public.progreso_calculo(p_user);
end;
$$;

revoke all on function public.progreso_calculo(uuid) from public, anon, authenticated;
revoke all on function public.mi_progreso() from public, anon;
revoke all on function public.progreso_alumno(uuid) from public, anon;
grant execute on function public.mi_progreso() to authenticated;
grant execute on function public.progreso_alumno(uuid) to authenticated;
