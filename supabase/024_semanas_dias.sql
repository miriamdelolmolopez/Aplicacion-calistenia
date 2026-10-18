-- Semanas de duración de cada rutina y días de la semana en que entrena cada alumna.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: solo añade una columna, una tabla y vuelve a definir una función.

-- 1. Duración de la rutina en semanas (las sesiones se repiten cada semana). Por defecto, 4.
alter table public.rutinas add column if not exists semanas int not null default 4
  check (semanas between 1 and 52);

-- 2. Días de la semana que la alumna se propone entrenar (1 = lunes … 7 = domingo).
create table if not exists public.dias_entreno (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dias int[] not null default '{}'
    check (dias <@ array[1, 2, 3, 4, 5, 6, 7]),
  actualizado_en timestamptz not null default now()
);

alter table public.dias_entreno enable row level security;
revoke all on public.dias_entreno from anon, authenticated;
grant select, insert, update on public.dias_entreno to authenticated;

drop policy if exists dias_entreno_ver on public.dias_entreno;
create policy dias_entreno_ver on public.dias_entreno
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists dias_entreno_crear on public.dias_entreno;
create policy dias_entreno_crear on public.dias_entreno
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists dias_entreno_cambiar on public.dias_entreno;
create policy dias_entreno_cambiar on public.dias_entreno
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3. Al copiar una rutina también se copian sus semanas y su foto.
create or replace function public.duplicar_rutina(p_rutina uuid, p_user_destino uuid, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  s record;
  nueva uuid;
  nueva_sesion uuid;
begin
  select * into r from public.rutinas where id = p_rutina;
  if not found then
    raise exception 'Rutina no encontrada';
  end if;
  if p_user_destino is not null
     and not exists (select 1 from public.profiles where id = p_user_destino and rol = 'alumno') then
    raise exception 'La persona debe ser alumno';
  end if;

  insert into public.rutinas (user_id, nombre, nota, entrenos_semana, semanas, foto_url, estado)
  values (
    p_user_destino,
    coalesce(nullif(trim(p_nombre), ''), r.nombre || ' (copia)'),
    r.nota,
    r.entrenos_semana,
    r.semanas,
    r.foto_url,
    'borrador'
  )
  returning id into nueva;

  for s in select * from public.rutina_sesiones where rutina_id = p_rutina order by orden loop
    insert into public.rutina_sesiones (rutina_id, orden, nombre, nota)
    values (nueva, s.orden, s.nombre, s.nota)
    returning id into nueva_sesion;

    insert into public.rutina_items (
      sesion_id, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max,
      peso_kg, distancia_m, descanso_seg, nota, grupo
    )
    select nueva_sesion, ejercicio_id, orden, series, reps_min, reps_max, segundos_min, segundos_max,
           peso_kg, distancia_m, descanso_seg, nota, grupo
    from public.rutina_items where sesion_id = s.id;
  end loop;

  return nueva;
end;
$$;
