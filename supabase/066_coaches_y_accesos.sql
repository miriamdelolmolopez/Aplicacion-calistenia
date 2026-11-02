-- Coaches (entrenadores) y accesos por persona.
--  · es_coach: la persona puede dar clases (sale al elegir quién da cada clase).
--  · excluidos_admin: secciones del panel de administración que esa administradora no puede usar.
--  · coach_id: quién da cada clase concreta y cada clase de una plantilla.

alter table public.profiles
  add column if not exists es_coach boolean not null default false,
  add column if not exists excluidos_admin text[] not null default '{}'::text[];

alter table public.sesiones_clase
  add column if not exists coach_id uuid references public.profiles (id) on delete set null;

alter table public.plantilla_clases
  add column if not exists coach_id uuid references public.profiles (id) on delete set null;

-- Al crear clases desde una plantilla, cada clase hereda el coach de su fila.
create or replace function public.crear_clases_rango(p_plantilla uuid, p_desde date, p_hasta date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas int := 0;
  nuevas int;
  dia date;
  fila record;
  inicio timestamptz;
begin
  for dia in select generate_series(p_desde, p_hasta, interval '1 day')::date
  loop
    for fila in
      select c.hora, c.coach_id, t.id as tipo_id, coalesce(c.plazas, t.plazas_max) as plazas, t.plazas_prueba
      from public.plantilla_clases c
      join public.tipos_clase t on t.id = c.tipo_id
      where c.plantilla_id = p_plantilla
        and t.activo
        and c.dia_semana = extract(isodow from dia)
    loop
      inicio := (dia + fila.hora) at time zone 'Europe/Madrid';
      if inicio > now() then
        insert into public.sesiones_clase (tipo_id, empieza_en, plazas, plazas_prueba, coach_id)
        values (fila.tipo_id, inicio, fila.plazas, least(fila.plazas_prueba, fila.plazas), fila.coach_id)
        on conflict (tipo_id, empieza_en) do nothing;
        get diagnostics nuevas = row_count;
        creadas := creadas + nuevas;
      end if;
    end loop;
  end loop;
  return creadas;
end;
$$;

revoke all on function public.crear_clases_rango(uuid, date, date) from public, anon, authenticated;
grant execute on function public.crear_clases_rango(uuid, date, date) to service_role;
