-- Una persona del registro puede tener varios tipos (por ejemplo, exalumna de grupal y de personal, o invitada que probó y luego fue alumna).
-- No borra ni cambia ningún dato: añade una columna y redefine una función.

alter table public.personas_registradas add column if not exists tipos text[] not null default '{}';

update public.personas_registradas set tipos = array[tipo] where cardinality(tipos) = 0;

alter table public.personas_registradas drop constraint if exists personas_registradas_tipos_check;
alter table public.personas_registradas add constraint personas_registradas_tipos_check
  check (tipos <@ array['exalumno_grupal', 'exalumno_individual', 'exalumno_online', 'exalumno_taller', 'invitado_sin_probar', 'invitado_probo']::text[]);

create or replace function public.anotar_prueba_usada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.es_prueba then
    return new;
  end if;
  if new.estado in ('cancelada', 'cancelada_clase') then
    delete from public.personas_registradas where reserva_id = new.id and origen = 'reserva';
  elsif new.estado in ('reservada', 'cancelada_tarde')
    and not exists (select 1 from public.personas_registradas where reserva_id = new.id) then
    insert into public.personas_registradas (nombre, correo, dni, telefono, origen, tipo, tipos, bloquea_prueba, reserva_id)
    select nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')), ''), p.email, p.dni, p.telefono, 'reserva', 'invitado_probo', array['invitado_probo'], true, new.id
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;
