-- 1) Tablón: apuntarse a un anuncio (por ejemplo una quedada) y ver las clases como las ve un/a alumno/a concreto/a.
-- No borra ni cambia datos existentes. Pegar entero en Supabase > SQL Editor > New query y pulsar Run.

alter table public.anuncios add column if not exists admite_apuntados boolean not null default false;
alter table public.anuncios add column if not exists max_plazas int check (max_plazas is null or max_plazas > 0);

create table if not exists public.anuncio_respuestas (
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  respuesta text not null check (respuesta in ('voy', 'no_puedo', 'pensar')),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  primary key (anuncio_id, user_id)
);
create index if not exists anuncio_respuestas_anuncio_idx on public.anuncio_respuestas (anuncio_id);

-- Solo se lee y se escribe desde el servidor de la app (como el resto del tablón).
alter table public.anuncio_respuestas enable row level security;
revoke all on public.anuncio_respuestas from anon, authenticated;

-- 2) «Ver como alumno/a»: las clases próximas tal y como las ve esa persona. Solo funciona si quien llama es administradora.
create or replace function public.clases_proximas_como(p_dias int, p_como uuid)
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
      coalesce((select p.rol from public.profiles p where p.id = p_como), '') as rol,
      coalesce((select a.valor from public.ajustes a where a.clave = 'ver_apuntados'), 'false') = 'true' as ver,
      coalesce((
        select array_agg(distinct x.s)
        from (
          select ps.servicio as s from public.perfil_servicios ps where ps.user_id = p_como
          union
          select b.servicio from public.bonos b where b.user_id = p_como and b.estado in ('activo', 'en_cola')
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
       where r.sesion_id = s.id and r.user_id = p_como and r.estado = 'reservada'),
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
              where l.sesion_id = s.id and l.user_id = p_como),
    (select count(*)::int from public.lista_espera l
       where l.sesion_id = s.id
         and l.creado_en <= (
           select l2.creado_en from public.lista_espera l2
           where l2.sesion_id = s.id and l2.user_id = p_como
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
  where p_como is not null
    and exists (select 1 from public.profiles q where q.id = auth.uid() and q.rol = 'admin')
    and s.empieza_en > now()
    and s.empieza_en <= now() + make_interval(days => p_dias)
  order by s.empieza_en;
$$;

revoke all on function public.clases_proximas_como(int, uuid) from public, anon;
grant execute on function public.clases_proximas_como(int, uuid) to authenticated;
