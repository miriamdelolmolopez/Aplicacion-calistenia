-- Privacidad: «Mostrar mi apellido». Si está desmarcado (lo normal), el resto de alumnos/as ve «Marie V.»;
-- si está marcado, ven «Marie Volpato». La administradora siempre lo ve completo.
-- No borra ni cambia ningún dato: todas las personas empiezan con el apellido oculto (como hasta ahora).

alter table public.profiles add column if not exists mostrar_apellido boolean not null default false;
grant update (mostrar_apellido) on public.profiles to authenticated;

drop function if exists public.clases_proximas(int);
create function public.clases_proximas(p_dias int default 14)
returns table (
  id uuid,
  tipo text,
  empieza_en timestamptz,
  plazas int,
  estado text,
  ocupadas int,
  mi_reserva uuid,
  apuntados text[],
  plazas_prueba int,
  ocupadas_prueba int,
  en_espera boolean,
  posicion int,
  hay_espera int,
  prioridad boolean,
  duracion_min int,
  apuntados_ids uuid[],
  servicio text,
  incluido boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (
    select
      coalesce((select p.rol from public.profiles p where p.id = auth.uid()), '') as rol,
      coalesce((select a.valor from public.ajustes a where a.clave = 'ver_apuntados'), 'false') = 'true' as ver,
      coalesce((
        select array_agg(distinct x.s)
        from (
          select ps.servicio as s from public.perfil_servicios ps where ps.user_id = auth.uid()
          union
          select b.servicio from public.bonos b where b.user_id = auth.uid() and b.estado in ('activo', 'en_cola')
        ) x
      ), '{}'::text[]) as servs
  )
  select
    s.id,
    t.nombre,
    s.empieza_en,
    s.plazas,
    s.estado,
    (select count(*)::int from public.reservas r
       where r.sesion_id = s.id and r.estado = 'reservada'),
    (select r.id from public.reservas r
       where r.sesion_id = s.id and r.user_id = auth.uid() and r.estado = 'reservada'),
    case
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio not in ('individual', 'taller')) from yo y)
      then coalesce((
        select array_agg(
          coalesce(nullif(split_part(coalesce(p.nombre, ''), ' ', 1), ''), 'Alumno')
          || case when coalesce(p.apellidos, '') <> ''
                  then ' ' || case when (select y.rol = 'admin' from yo y) or p.mostrar_apellido then p.apellidos
                                   else upper(left(p.apellidos, 1)) || '.' end
                  else '' end
          order by r.creado_en
        )
        from public.reservas r join public.profiles p on p.id = r.user_id
        where r.sesion_id = s.id and r.estado = 'reservada'
      ), '{}')
      else '{}'::text[]
    end,
    s.plazas_prueba,
    (select count(*)::int from public.reservas r
       where r.sesion_id = s.id and r.estado = 'reservada' and r.es_prueba),
    exists (select 1 from public.lista_espera l
              where l.sesion_id = s.id and l.user_id = auth.uid()),
    (select count(*)::int from public.lista_espera l
       where l.sesion_id = s.id
         and l.creado_en <= (
           select l2.creado_en from public.lista_espera l2
           where l2.sesion_id = s.id and l2.user_id = auth.uid()
         )),
    (select count(*)::int from public.lista_espera l where l.sesion_id = s.id),
    (
      (select count(*) from public.lista_espera l where l.sesion_id = s.id) > 0
      and now() < s.empieza_en
        - make_interval(hours => public.ajuste_numero('espera_prioridad_horas', 2))
    ),
    t.duracion_min,
    case
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio not in ('individual', 'taller')) from yo y)
      then coalesce((
        select array_agg(r.user_id order by r.creado_en)
        from public.reservas r
        where r.sesion_id = s.id and r.estado = 'reservada'
      ), '{}')
      else '{}'::uuid[]
    end,
    t.servicio,
    (
      select case
        when y.rol = 'admin' then true
        when y.rol = 'alumno' then
          t.servicio = any (case when cardinality(y.servs) = 0 then array['grupal'] else y.servs end)
        else t.servicio = 'grupal' or t.servicio = any (y.servs)
      end
      from yo y
    )
  from public.sesiones_clase s
  join public.tipos_clase t on t.id = s.tipo_id
  where auth.uid() is not null
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
  order by s.empieza_en;
$$;

revoke all on function public.clases_proximas(int) from public, anon;
grant execute on function public.clases_proximas(int) to authenticated;

create or replace function public.cumpleanos_hoy()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = public
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  yo as (select rol from public.profiles where id = auth.uid())
  select
    p.id,
    coalesce(nullif(split_part(coalesce(p.nombre, ''), ' ', 1), ''), 'Alumno')
      || case when coalesce(p.apellidos, '') <> ''
              then ' ' || case when yo.rol = 'admin' or p.mostrar_apellido then p.apellidos
                               else upper(left(p.apellidos, 1)) || '.' end
              else '' end
  from public.profiles p, hoy, yo
  where yo.rol in ('alumno', 'admin')
    and p.rol = 'alumno'
    and p.avisar_cumple
    and p.fecha_nacimiento is not null
    and (
      (extract(month from p.fecha_nacimiento) = extract(month from hoy.d)
        and extract(day from p.fecha_nacimiento) = extract(day from hoy.d))
      or (
        extract(month from p.fecha_nacimiento) = 2 and extract(day from p.fecha_nacimiento) = 29
        and extract(month from hoy.d) = 2 and extract(day from hoy.d) = 28
        and not (
          (extract(year from hoy.d)::int % 4 = 0 and extract(year from hoy.d)::int % 100 <> 0)
          or extract(year from hoy.d)::int % 400 = 0
        )
      )
    )
  order by p.nombre;
$$;

revoke all on function public.cumpleanos_hoy() from public, anon;
grant execute on function public.cumpleanos_hoy() to authenticated;
