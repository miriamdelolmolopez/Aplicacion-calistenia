-- Servicio nuevo: Talleres (para gente externa que viene a un taller o workshop).
-- Una persona con el servicio Talleres solo puede reservar clases de tipo taller; el resto las ve pero no las puede reservar.

-- 1. Se permite el valor «taller» en los sitios donde se guarda el servicio.
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.tipos_clase'::regclass, 'public.tipos_bono'::regclass, 'public.perfil_servicios'::regclass)
      and pg_get_constraintdef(c.oid) like '%''grupal''%'
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
  end loop;
end
$$;

alter table public.tipos_clase
  add constraint tipos_clase_servicio_check check (servicio in ('grupal', 'individual', 'online', 'taller'));
alter table public.tipos_bono
  add constraint tipos_bono_servicio_check check (servicio in ('grupal', 'individual', 'online', 'taller'));
alter table public.tipos_bono
  add constraint tipos_bono_servicio2_check check (servicio2 is null or servicio2 in ('grupal', 'individual', 'online', 'taller'));
alter table public.perfil_servicios
  add constraint perfil_servicios_servicio_check check (servicio in ('grupal', 'individual', 'online', 'taller'));

-- 2. En los talleres no se enseñan los nombres de las personas apuntadas (como en las clases individuales).
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
                  then ' ' || upper(left(p.apellidos, 1)) || '.' else '' end
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
