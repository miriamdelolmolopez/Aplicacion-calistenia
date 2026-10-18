-- Alumnas individuales: tipo de clase «Entrenamiento personal», bonos individuales y visibilidad por servicio
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. Tipo de clase «Entrenamiento personal»: 1 plaza, 60 minutos, sin clase de prueba.
insert into public.tipos_clase (nombre, plazas_max, minimo_alumnos, duracion_min, plazas_prueba, servicio)
values ('Entrenamiento personal', 1, 0, 60, 0, 'individual')
on conflict (nombre) do nothing;

-- 2. Bonos individuales (30 días de validez). Precios en céntimos.
insert into public.tipos_bono (nombre, servicio, clases, validez_dias, precio_centimos, requiere_pago, orden)
select v.nombre, 'individual', v.clases, 30, v.precio, false,
       (select coalesce(max(orden), 0) from public.tipos_bono) + v.pos
from (values
  ('Sesión personal suelta', 1, 3000, 1),
  ('Bono 4 sesiones personales', 4, 11000, 2),
  ('Bono 8 sesiones personales', 8, 20000, 3)
) as v (nombre, clases, precio, pos)
on conflict (nombre) do nothing;

-- 3. Cada persona solo ve las clases de los servicios que tiene:
--    · administradora: todas · invitada: solo grupales
--    · alumna: las de sus servicios (si no tiene ninguno todavía, las grupales)
--    · en las sesiones personales nadie ve a las demás personas (solo la administradora).
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
  apuntados_ids uuid[]
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
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio <> 'individual') from yo y)
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
      when (select y.rol = 'admin' or (y.rol = 'alumno' and y.ver and t.servicio <> 'individual') from yo y)
      then coalesce((
        select array_agg(r.user_id order by r.creado_en)
        from public.reservas r
        where r.sesion_id = s.id and r.estado = 'reservada'
      ), '{}')
      else '{}'::uuid[]
    end
  from public.sesiones_clase s
  join public.tipos_clase t on t.id = s.tipo_id
  where auth.uid() is not null
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
    and (
      select case
        when y.rol = 'admin' then true
        when y.rol = 'alumno' then
          t.servicio = any (case when cardinality(y.servs) = 0 then array['grupal'] else y.servs end)
        else t.servicio = 'grupal'
      end
      from yo y
    )
  order by s.empieza_en;
$$;

revoke all on function public.clases_proximas(int) from public, anon;
grant execute on function public.clases_proximas(int) to authenticated;
