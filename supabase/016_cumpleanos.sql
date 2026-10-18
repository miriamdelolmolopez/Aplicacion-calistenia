-- Aviso de cumpleaños: quién cumple años hoy (hora de Madrid).
-- Solo lo ven las alumnas y Miriam; solo salen las personas con el aviso activado en Ajustes.
-- Los nacidos el 29 de febrero se celebran el 28 en los años que no son bisiestos.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
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
              then ' ' || upper(left(p.apellidos, 1)) || '.' else '' end
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
