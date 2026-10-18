-- Sección Usuarios: resumen de cada persona, asistencia a clases y notas privadas de Miriam
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. NOTAS PRIVADAS (solo las ve Miriam) ----------------------------------------------
create table if not exists public.notas_usuario (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 4000),
  actualizado_en timestamptz not null default now()
);
alter table public.notas_usuario enable row level security;
revoke all on public.notas_usuario from anon, authenticated;
grant select on public.notas_usuario to authenticated;

drop policy if exists notas_usuario_ver on public.notas_usuario;
create policy notas_usuario_ver on public.notas_usuario
  for select to authenticated using ((select public.es_admin()));

-- 2. RESUMEN DE TODAS LAS PERSONAS (para la lista de Usuarios) ---------------------------
-- "Ha venido" = tenía reserva, no la canceló y la clase ya ha pasado.
create or replace function public.resumen_usuarios()
returns table (
  id uuid,
  email text,
  nombre text,
  apellidos text,
  rol text,
  foto_path text,
  creado_en timestamptz,
  ultima_conexion timestamptz,
  servicios text[],
  clases_restantes int,
  bono_caduca timestamptz,
  plan_online_hasta timestamptz,
  proxima_clase timestamptz,
  ultima_clase timestamptz,
  clases_mes int,
  entrenos_mes int,
  ultimo_entreno timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inicio_mes timestamp := date_trunc('month', now() at time zone 'Europe/Madrid');
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede ver esto';
  end if;
  perform public.refrescar_bonos();

  return query
  select
    p.id, p.email, p.nombre, p.apellidos, p.rol, p.foto_path, p.creado_en,
    (select u.last_sign_in_at from auth.users u where u.id = p.id),
    (select coalesce(array_agg(distinct x.s order by x.s), '{}'::text[])
       from (
         select ps.servicio as s from public.perfil_servicios ps where ps.user_id = p.id
         union
         select b.servicio from public.bonos b where b.user_id = p.id and b.estado in ('activo', 'en_cola')
       ) x),
    (select sum(b.clases_restantes)::int from public.bonos b
       where b.user_id = p.id and b.estado = 'activo' and b.servicio <> 'online'),
    (select min(b.caduca_en) from public.bonos b
       where b.user_id = p.id and b.estado = 'activo' and b.servicio <> 'online'),
    (select max(b.caduca_en) from public.bonos b
       where b.user_id = p.id and b.estado = 'activo' and b.servicio = 'online'),
    (select min(s.empieza_en) from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
       where r.user_id = p.id and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en > now()),
    (select max(s.empieza_en) from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
       where r.user_id = p.id and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()),
    (select count(*)::int from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
       where r.user_id = p.id and r.estado = 'reservada' and s.estado = 'programada'
         and s.empieza_en <= now() and (s.empieza_en at time zone 'Europe/Madrid') >= inicio_mes),
    (select count(*)::int from public.entrenos e
       where e.user_id = p.id and e.estado = 'terminado'
         and (e.terminado_en at time zone 'Europe/Madrid') >= inicio_mes),
    (select max(e.terminado_en) from public.entrenos e where e.user_id = p.id and e.estado = 'terminado')
  from public.profiles p
  where p.rol <> 'admin'
  order by p.creado_en desc;
end;
$$;

-- 3. ASISTENCIA A CLASES DE UNA PERSONA (para su ficha) -----------------------------------
-- Racha: semanas seguidas (lunes a domingo, hora de Madrid) con al menos una clase;
-- la semana en curso no rompe la racha si todavía no ha venido.
create or replace function public.asistencia_usuario(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  zona constant text := 'Europe/Madrid';
  total int;
  ultima timestamptz;
  dias int;
  mes int;
  racha int := 0;
  semana_actual date := date_trunc('week', now() at time zone zona)::date;
  semana date;
  n int;
  i int;
  por_mes jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede ver esto';
  end if;

  select count(*)::int, max(s.empieza_en) into total, ultima
  from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
  where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now();

  if ultima is not null then
    dias := (now() at time zone zona)::date - (ultima at time zone zona)::date;
  end if;

  select count(*)::int into mes
  from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
  where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
    and (s.empieza_en at time zone zona) >= date_trunc('month', now() at time zone zona);

  for i in 0..519 loop
    semana := semana_actual - i * 7;
    select count(*) into n
    from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
    where r.user_id = p_user and r.estado = 'reservada' and s.estado = 'programada' and s.empieza_en <= now()
      and (s.empieza_en at time zone zona)::date >= semana
      and (s.empieza_en at time zone zona)::date < semana + 7;
    if n > 0 then
      racha := racha + 1;
    elsif i > 0 then
      exit;
    end if;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object('mes', m.mes, 'clases', m.n) order by m.mes), '[]'::jsonb) into por_mes
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
    'total_clases', total,
    'clases_mes', mes,
    'ultima_clase', ultima,
    'dias_sin_venir', dias,
    'racha_semanas', racha,
    'por_mes', por_mes
  );
end;
$$;

revoke all on function public.resumen_usuarios() from public, anon;
revoke all on function public.asistencia_usuario(uuid) from public, anon;
grant execute on function public.resumen_usuarios() to authenticated;
grant execute on function public.asistencia_usuario(uuid) to authenticated;
