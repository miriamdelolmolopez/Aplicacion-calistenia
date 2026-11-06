-- Registro de personas sin cuenta: exalumnos (grupal, personal, online, talleres) e invitados antiguos
-- (que nunca usaron su prueba o que probaron y no volvieron). Cada una puede bloquear o no la clase de prueba gratis.
-- No borra ni cambia ningún dato: renombra la tabla de 078, añade dos columnas y redefine dos funciones.

alter table if exists public.pruebas_usadas rename to personas_registradas;

alter table public.personas_registradas add column if not exists tipo text not null default 'invitado_probo';
alter table public.personas_registradas add column if not exists bloquea_prueba boolean not null default true;

alter table public.personas_registradas drop constraint if exists personas_registradas_tipo_check;
alter table public.personas_registradas add constraint personas_registradas_tipo_check
  check (tipo in ('exalumno_grupal', 'exalumno_individual', 'exalumno_online', 'exalumno_taller', 'invitado_sin_probar', 'invitado_probo'));

update public.personas_registradas set tipo = 'invitado_probo', bloquea_prueba = true where origen = 'reserva';

-- Al reservar una clase de prueba se anota; si se cancela a tiempo (no cuenta), se quita.
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
    insert into public.personas_registradas (nombre, correo, dni, telefono, origen, tipo, bloquea_prueba, reserva_id)
    select nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')), ''), p.email, p.dni, p.telefono, 'reserva', 'invitado_probo', true, new.id
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;

-- ¿Ya ha gastado la clase de prueba? Esta cuenta u otra con el mismo teléfono (como antes),
-- o alguien del registro marcado como «bloquea la prueba» con el mismo correo, DNI o teléfono.
create or replace function public.prueba_gastada(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.reservas r
      join public.profiles pr on pr.id = r.user_id
      join public.profiles yo on yo.id = p_user
      where r.es_prueba
        and r.estado in ('reservada', 'cancelada_tarde')
        and (
          r.user_id = p_user
          or (
            length(regexp_replace(coalesce(yo.telefono, ''), '[^0-9]', '', 'g')) >= 9
            and right(regexp_replace(coalesce(pr.telefono, ''), '[^0-9]', '', 'g'), 9)
              = right(regexp_replace(coalesce(yo.telefono, ''), '[^0-9]', '', 'g'), 9)
          )
        )
    )
    or exists (
      select 1
      from public.personas_registradas u
      join public.profiles yo on yo.id = p_user
      where u.bloquea_prueba
        and (
          (coalesce(u.correo, '') <> '' and lower(u.correo) = lower(coalesce(yo.email, '')))
          or (
            length(regexp_replace(coalesce(u.dni, ''), '[^0-9A-Za-z]', '', 'g')) >= 6
            and upper(regexp_replace(u.dni, '[^0-9A-Za-z]', '', 'g')) = upper(regexp_replace(coalesce(yo.dni, ''), '[^0-9A-Za-z]', '', 'g'))
          )
          or (
            length(regexp_replace(coalesce(u.telefono, ''), '[^0-9]', '', 'g')) >= 9
            and right(regexp_replace(u.telefono, '[^0-9]', '', 'g'), 9)
              = right(regexp_replace(coalesce(yo.telefono, ''), '[^0-9]', '', 'g'), 9)
          )
        )
    );
$$;
