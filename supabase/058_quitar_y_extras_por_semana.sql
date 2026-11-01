-- Quitar un ejercicio solo en una semana, o añadir un ejercicio extra solo en una semana.

alter table public.rutina_cambios_semana add column if not exists quitado boolean not null default false;

create table if not exists public.rutina_extras_semana (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.rutina_sesiones (id) on delete cascade,
  semana int not null check (semana between 1 and 52),
  ejercicio_id uuid not null references public.ejercicios (id) on delete restrict,
  orden int not null default 1000,
  series int not null default 3 check (series between 1 and 20),
  reps_min int check (reps_min is null or reps_min between 1 and 500),
  reps_max int check (reps_max is null or reps_max between 1 and 500),
  segundos_min int check (segundos_min is null or segundos_min between 1 and 7200),
  segundos_max int check (segundos_max is null or segundos_max between 1 and 7200),
  peso_kg numeric(6, 2) check (peso_kg is null or peso_kg between 0 and 500),
  distancia_m int check (distancia_m is null or distancia_m between 1 and 100000),
  descanso_seg int check (descanso_seg is null or descanso_seg between 0 and 900),
  nota text check (nota is null or char_length(nota) <= 300),
  creado_en timestamptz not null default now()
);
create index if not exists rutina_extras_semana_sesion on public.rutina_extras_semana (sesion_id, semana);

alter table public.rutina_extras_semana enable row level security;
revoke all on public.rutina_extras_semana from anon, authenticated;
grant select on public.rutina_extras_semana to authenticated;

drop policy if exists extras_semana_ver on public.rutina_extras_semana;
create policy extras_semana_ver on public.rutina_extras_semana
  for select to authenticated
  using ((select public.es_admin()) or public.sesion_visible(sesion_id));

create or replace function public.iniciar_entreno(p_user uuid, p_sesion uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ses record;
  rut record;
  it record;
  nuevo uuid;
  pos int := 0;
  n int;
  sem_actual int;
begin
  if not public.tiene_plan_online(p_user) then
    raise exception 'Tu plan online no está activo';
  end if;

  select * into ses from public.rutina_sesiones where id = p_sesion;
  if not found then
    raise exception 'Sesión no encontrada';
  end if;
  select * into rut from public.rutinas where id = ses.rutina_id;
  if rut.user_id is distinct from p_user or rut.estado <> 'publicada' then
    raise exception 'Solo puedes entrenar sesiones de tu rutina publicada';
  end if;
  if exists (select 1 from public.entrenos where user_id = p_user and estado = 'en_curso') then
    raise exception 'Ya tienes un entreno en curso';
  end if;
  if not exists (select 1 from public.rutina_items where sesion_id = p_sesion) then
    raise exception 'La sesión no tiene ejercicios';
  end if;

  -- Semana de la rutina (la de su publicación es la 1; de lunes a domingo, hora de Madrid).
  sem_actual := greatest(
    1,
    ((date_trunc('week', now() at time zone 'Europe/Madrid')::date
      - date_trunc('week', coalesce(rut.publicada_en, now()) at time zone 'Europe/Madrid')::date) / 7) + 1
  );

  insert into public.entrenos (user_id, rutina_id, sesion_id, nombre_rutina, nombre_sesion)
  values (p_user, rut.id, ses.id, rut.nombre, ses.nombre)
  returning id into nuevo;

  for it in
    select i.id as item_id,
           coalesce(c.ejercicio_id, i.ejercicio_id) as ejercicio_id,
           coalesce(c.series, i.series) as series,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.reps_min else coalesce(c.reps_min, i.reps_min) end as reps_min,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.reps_max else coalesce(c.reps_max, i.reps_max) end as reps_max,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.segundos_min else coalesce(c.segundos_min, i.segundos_min) end as segundos_min,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.segundos_max else coalesce(c.segundos_max, i.segundos_max) end as segundos_max,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.peso_kg else coalesce(c.peso_kg, i.peso_kg) end as peso_kg,
           case when c.ejercicio_id is not null and c.ejercicio_id <> i.ejercicio_id
                then c.distancia_m else coalesce(c.distancia_m, i.distancia_m) end as distancia_m,
           coalesce(c.descanso_seg, i.descanso_seg) as descanso_seg,
           coalesce(c.nota, i.nota) as nota,
           i.grupo,
           e.nombre as nombre_ej,
           e.tipo as tipo_ej
    from public.rutina_items i
    left join public.rutina_cambios_semana c on c.item_id = i.id and c.semana = sem_actual
    join public.ejercicios e on e.id = coalesce(c.ejercicio_id, i.ejercicio_id)
    where i.sesion_id = p_sesion and not coalesce(c.quitado, false)
    order by i.orden, i.creado_en, i.id
  loop
    pos := pos + 1;
    for n in 1..it.series loop
      insert into public.entreno_series (
        entreno_id, item_id, ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero,
        grupo, descanso_seg, nota_objetivo,
        obj_reps_min, obj_reps_max, obj_segundos_min, obj_segundos_max, obj_peso_kg, obj_distancia_m
      )
      values (
        nuevo, it.item_id, it.ejercicio_id, it.nombre_ej, it.tipo_ej, pos, n,
        it.grupo, it.descanso_seg, it.nota,
        it.reps_min, it.reps_max, it.segundos_min, it.segundos_max, it.peso_kg, it.distancia_m
      );
    end loop;
  end loop;

  -- Ejercicios extra que solo hay esta semana.
  for it in
    select x.id as item_id,
           x.ejercicio_id,
           x.series,
           x.reps_min, x.reps_max, x.segundos_min, x.segundos_max, x.peso_kg, x.distancia_m,
           coalesce(x.descanso_seg, 60) as descanso_seg,
           x.nota,
           null::int as grupo,
           e.nombre as nombre_ej,
           e.tipo as tipo_ej
    from public.rutina_extras_semana x
    join public.ejercicios e on e.id = x.ejercicio_id
    where x.sesion_id = p_sesion and x.semana = sem_actual
    order by x.orden, x.creado_en, x.id
  loop
    pos := pos + 1;
    for n in 1..it.series loop
      insert into public.entreno_series (
        entreno_id, item_id, ejercicio_id, nombre_ejercicio, tipo, orden_ejercicio, numero,
        grupo, descanso_seg, nota_objetivo,
        obj_reps_min, obj_reps_max, obj_segundos_min, obj_segundos_max, obj_peso_kg, obj_distancia_m
      )
      values (
        nuevo, null, it.ejercicio_id, it.nombre_ej, it.tipo_ej, pos, n,
        null, it.descanso_seg, it.nota,
        it.reps_min, it.reps_max, it.segundos_min, it.segundos_max, it.peso_kg, it.distancia_m
      );
    end loop;
  end loop;

  return nuevo;
exception
  when unique_violation then
    raise exception 'Ya tienes un entreno en curso';
end;
$$;

revoke all on function public.iniciar_entreno(uuid, uuid) from public, anon, authenticated;
grant execute on function public.iniciar_entreno(uuid, uuid) to service_role;
