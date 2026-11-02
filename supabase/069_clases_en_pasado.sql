-- Crear clases en días pasados desde una plantilla (por ejemplo, para apuntar a quien ya tenía clases hechas).
-- Solo se crean clases pasadas si se pide expresamente (p_pasadas = true); por defecto se comporta igual que antes.
-- No borra ni cambia ningún dato.

drop function if exists public.crear_clases_rango(uuid, date, date);

create or replace function public.crear_clases_rango(p_plantilla uuid, p_desde date, p_hasta date, p_pasadas boolean default false)
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
      if p_pasadas or inicio > now() then
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

revoke all on function public.crear_clases_rango(uuid, date, date, boolean) from public, anon, authenticated;
grant execute on function public.crear_clases_rango(uuid, date, date, boolean) to service_role;
