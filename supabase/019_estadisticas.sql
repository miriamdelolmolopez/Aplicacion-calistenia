-- Estadísticas e informes (solo Miriam)
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. Sexo (opcional) para poder segmentar. Cada persona puede cambiarlo en su perfil.
alter table public.profiles
  add column if not exists sexo text check (sexo is null or sexo in ('mujer', 'hombre', 'otro'));
grant update (sexo) on public.profiles to authenticated;

-- 2. Informe completo de un periodo. «Activa» = alumna con un bono o plan en vigor, o que ha venido
--    a clase o entrenado en los últimos 30 días. Los ingresos cuentan los pagos cobrados.
create or replace function public.estadisticas(p_desde date, p_hasta date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  zona constant text := 'Europe/Madrid';
  v_hoy date := (now() at time zone zona)::date;
  v_desde timestamptz;
  v_hasta timestamptz;
  v_dias int;
  v_ant_desde timestamptz;
  v_ant_hasta timestamptz;
  v_ano_desde timestamptz;
  v_ano_hasta timestamptz;
  v_res jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo la administradora puede ver esto';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 800 then
    raise exception 'El periodo no es válido';
  end if;
  perform public.refrescar_bonos();

  v_desde := p_desde::timestamp at time zone zona;
  v_hasta := (p_hasta + 1)::timestamp at time zone zona;      -- el día final entra entero
  v_dias := p_hasta - p_desde + 1;
  v_ant_desde := (p_desde - v_dias)::timestamp at time zone zona;   -- el periodo anterior, igual de largo
  v_ant_hasta := v_desde;
  v_ano_desde := (p_desde - interval '1 year')::date::timestamp at time zone zona;   -- el mismo periodo de hace un año
  v_ano_hasta := ((p_hasta - interval '1 year')::date + 1)::timestamp at time zone zona;

  with
  alumnos as (select p.* from public.profiles p where p.rol = 'alumno'),
  servicios as (
    select a.id, coalesce(array_agg(distinct s.s) filter (where s.s is not null), '{}'::text[]) as lista
    from alumnos a
    left join (
      select ps.user_id, ps.servicio as s from public.perfil_servicios ps
      union
      select b.user_id, b.servicio from public.bonos b where b.estado in ('activo', 'en_cola')
    ) s on s.user_id = a.id
    group by a.id
  ),
  actividad as (
    select a.id,
      exists (select 1 from public.bonos b where b.user_id = a.id and b.estado = 'activo') as con_bono,
      exists (
        select 1 from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
        where r.user_id = a.id and r.estado = 'reservada' and s.estado = 'programada'
          and s.empieza_en between now() - interval '30 days' and now()
      ) as vino,
      exists (
        select 1 from public.entrenos e
        where e.user_id = a.id and e.estado = 'terminado' and e.terminado_en >= now() - interval '30 days'
      ) as entreno
    from alumnos a
  ),
  activos as (
    select a.*, sv.lista as servicios,
           case when a.fecha_nacimiento is null then null
                else date_part('year', age(v_hoy::timestamp, a.fecha_nacimiento::timestamp))::int end as edad
    from alumnos a
    join actividad x on x.id = a.id
    join servicios sv on sv.id = a.id
    where x.con_bono or x.vino or x.entreno
  ),
  pagos_ok as (
    select pg.*, coalesce(pg.pagado_en, pg.creado_en) as cuando
    from public.pagos pg where pg.estado = 'pagado'
  ),
  meses as (
    select g.m
    from generate_series(
      date_trunc('month', v_hoy::timestamp) - interval '11 months',
      date_trunc('month', v_hoy::timestamp),
      interval '1 month'
    ) as g (m)
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('desde', p_desde, 'hasta', p_hasta, 'dias', v_dias),

    'personas', jsonb_build_object(
      'total', (select count(*) from public.profiles where rol <> 'admin'),
      'alumnas', (select count(*) from alumnos),
      'invitadas', (select count(*) from public.profiles where rol = 'invitado'),
      'activas', (select count(*) from activos)
    ),

    'por_servicio', jsonb_build_object(
      'grupal', (select count(*) from activos where 'grupal' = any (servicios)),
      'individual', (select count(*) from activos where 'individual' = any (servicios)),
      'online', (select count(*) from activos where 'online' = any (servicios)),
      'sin_servicio', (select count(*) from activos where cardinality(servicios) = 0)
    ),

    'por_sexo', jsonb_build_object(
      'mujer', (select count(*) from activos where sexo = 'mujer'),
      'hombre', (select count(*) from activos where sexo = 'hombre'),
      'otro', (select count(*) from activos where sexo = 'otro'),
      'sin_dato', (select count(*) from activos where sexo is null)
    ),

    'por_edad', jsonb_build_object(
      'menos_18', (select count(*) from activos where edad < 18),
      'de_18_a_25', (select count(*) from activos where edad between 18 and 25),
      'de_26_a_35', (select count(*) from activos where edad between 26 and 35),
      'de_36_a_45', (select count(*) from activos where edad between 36 and 45),
      'de_46_a_55', (select count(*) from activos where edad between 46 and 55),
      'mas_55', (select count(*) from activos where edad > 55),
      'sin_dato', (select count(*) from activos where edad is null)
    ),

    'altas_mensuales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mes', to_char(m.m, 'YYYY-MM'),
        'altas', (select count(*) from public.profiles p
                  where p.rol <> 'admin' and date_trunc('month', p.creado_en at time zone zona) = m.m)
      ) order by m.m)
      from meses m
    ), '[]'::jsonb),

    'tarifas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', t.nombre, 'servicio', t.servicio, 'contratadas', x.n, 'ingresos', x.suma
      ) order by x.n desc, t.nombre)
      from (
        select b.tipo_bono_id, count(*)::int as n,
               coalesce(sum(pg.importe_centimos) filter (where pg.estado = 'pagado'), 0)::bigint as suma
        from public.bonos b
        left join lateral (
          select p.importe_centimos, p.estado from public.pagos p where p.bono_id = b.id order by p.creado_en limit 1
        ) pg on true
        where b.estado <> 'anulado' and b.creado_en >= v_desde and b.creado_en < v_hasta
        group by b.tipo_bono_id
      ) x
      join public.tipos_bono t on t.id = x.tipo_bono_id
    ), '[]'::jsonb),

    'implicadas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', z.id, 'nombre', z.nombre, 'clases', z.clases, 'entrenos', z.entrenos, 'total', z.clases + z.entrenos
      ) order by z.clases + z.entrenos desc, z.nombre)
      from (
        select y.id, y.nombre, y.clases, y.entrenos
        from (
          select a.id,
            trim(coalesce(a.nombre, '') || ' ' || coalesce(a.apellidos, '')) as nombre,
            (select count(*)::int from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
               where r.user_id = a.id and r.estado = 'reservada' and s.estado = 'programada'
                 and s.empieza_en >= v_desde and s.empieza_en < v_hasta and s.empieza_en <= now()) as clases,
            (select count(*)::int from public.entrenos e
               where e.user_id = a.id and e.estado = 'terminado'
                 and e.terminado_en >= v_desde and e.terminado_en < v_hasta) as entrenos
          from alumnos a
        ) y
        where y.clases + y.entrenos > 0
        order by y.clases + y.entrenos desc, y.nombre
        limit 10
      ) z
    ), '[]'::jsonb),

    'ingresos', jsonb_build_object(
      'total_periodo', coalesce((select sum(importe_centimos) from pagos_ok where cuando >= v_desde and cuando < v_hasta), 0)::bigint,
      'total_periodo_anterior', coalesce((select sum(importe_centimos) from pagos_ok where cuando >= v_ant_desde and cuando < v_ant_hasta), 0)::bigint,
      'total_mismo_periodo_ano_anterior', coalesce((select sum(importe_centimos) from pagos_ok where cuando >= v_ano_desde and cuando < v_ano_hasta), 0)::bigint,
      'descuentos_periodo', coalesce((select sum(descuento_centimos) from pagos_ok where cuando >= v_desde and cuando < v_hasta), 0)::bigint,
      'pendiente_cobro', coalesce((select sum(importe_centimos) from public.pagos where estado = 'pendiente'), 0)::bigint,
      'pagos_periodo', (select count(*) from pagos_ok where cuando >= v_desde and cuando < v_hasta),
      'por_metodo', coalesce((
        select jsonb_agg(jsonb_build_object('metodo', q.metodo, 'total', q.t) order by q.t desc)
        from (select metodo, sum(importe_centimos)::bigint as t from pagos_ok
              where cuando >= v_desde and cuando < v_hasta group by metodo) q
      ), '[]'::jsonb),
      'por_servicio', coalesce((
        select jsonb_agg(jsonb_build_object('servicio', q.servicio, 'total', q.t) order by q.t desc)
        from (select coalesce(tb.servicio, 'otros') as servicio, sum(pk.importe_centimos)::bigint as t
              from pagos_ok pk
              left join public.bonos b on b.id = pk.bono_id
              left join public.tipos_bono tb on tb.id = b.tipo_bono_id
              where pk.cuando >= v_desde and pk.cuando < v_hasta
              group by coalesce(tb.servicio, 'otros')) q
      ), '[]'::jsonb),
      'mensual', coalesce((
        select jsonb_agg(jsonb_build_object(
          'mes', to_char(m.m, 'YYYY-MM'),
          'total', coalesce((select sum(importe_centimos) from pagos_ok
                             where date_trunc('month', cuando at time zone zona) = m.m), 0)::bigint,
          'ano_anterior', coalesce((select sum(importe_centimos) from pagos_ok
                             where date_trunc('month', cuando at time zone zona) = m.m - interval '1 year'), 0)::bigint
        ) order by m.m)
        from meses m
      ), '[]'::jsonb),
      'anual', jsonb_build_object(
        'este_ano', coalesce((select sum(importe_centimos) from pagos_ok
                      where extract(year from cuando at time zone zona) = extract(year from v_hoy)), 0)::bigint,
        'ano_anterior', coalesce((select sum(importe_centimos) from pagos_ok
                      where extract(year from cuando at time zone zona) = extract(year from v_hoy) - 1), 0)::bigint
      )
    ),

    'conversion', (
      select jsonb_build_object(
        'pruebas', count(*),
        'convertidas', count(*) filter (where exists (
          select 1 from public.bonos b where b.user_id = u.user_id and b.estado <> 'anulado'))
      )
      from (
        select distinct r.user_id
        from public.reservas r join public.sesiones_clase s on s.id = r.sesion_id
        where r.es_prueba and r.estado = 'reservada' and s.empieza_en <= now()
          and s.empieza_en >= v_desde and s.empieza_en < v_hasta
      ) u
    ),

    'ocupacion', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'hora', x.hora, 'clases', x.n, 'ocupacion', x.ocup)
                       order by x.tipo, x.hora)
      from (
        select t.nombre as tipo,
               to_char(s.empieza_en at time zone zona, 'HH24:MI') as hora,
               count(*)::int as n,
               round(100.0 * avg(least(1.0,
                 (select count(*) from public.reservas r where r.sesion_id = s.id and r.estado = 'reservada')::numeric
                 / s.plazas)))::int as ocup
        from public.sesiones_clase s join public.tipos_clase t on t.id = s.tipo_id
        where s.estado = 'programada' and s.empieza_en >= v_desde and s.empieza_en < v_hasta and s.empieza_en <= now()
        group by t.nombre, to_char(s.empieza_en at time zone zona, 'HH24:MI')
      ) x
    ), '[]'::jsonb),

    'clases_canceladas', (select count(*) from public.sesiones_clase
                          where estado = 'cancelada' and empieza_en >= v_desde and empieza_en < v_hasta)
  ) into v_res;

  return v_res;
end;
$$;

revoke all on function public.estadisticas(date, date) from public, anon;
grant execute on function public.estadisticas(date, date) to authenticated;
