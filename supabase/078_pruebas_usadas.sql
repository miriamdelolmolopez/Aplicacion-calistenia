-- Registro permanente de «ya probó»: quién ha usado ya su clase de prueba gratuita (aunque su cuenta se borre)
-- y exalumnas / invitadas antiguas que Miriam añade a mano. Se comprueba por correo, DNI o teléfono.
-- No borra ni cambia ningún dato: crea una tabla, un aviso automático y amplía una función.
-- Solo la administradora (con la clave de servicio) lee y escribe esta tabla.

create table if not exists public.pruebas_usadas (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  correo text,
  dni text,
  telefono text,
  origen text not null default 'reserva' check (origen in ('reserva', 'manual')),
  nota text,
  reserva_id uuid references public.reservas(id) on delete set null,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.profiles(id) on delete set null
);

create index if not exists pruebas_usadas_correo_idx on public.pruebas_usadas (lower(correo));
create index if not exists pruebas_usadas_reserva_idx on public.pruebas_usadas (reserva_id);

alter table public.pruebas_usadas enable row level security;
revoke all on public.pruebas_usadas from anon, authenticated;

-- Las pruebas que ya existen (vigentes o canceladas tarde).
insert into public.pruebas_usadas (nombre, correo, dni, telefono, origen, reserva_id, creado_en)
select nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')), ''), p.email, p.dni, p.telefono, 'reserva', r.id, r.creado_en
from public.reservas r
join public.profiles p on p.id = r.user_id
where r.es_prueba
  and r.estado in ('reservada', 'cancelada_tarde')
  and not exists (select 1 from public.pruebas_usadas u where u.reserva_id = r.id);

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
    delete from public.pruebas_usadas where reserva_id = new.id and origen = 'reserva';
  elsif new.estado in ('reservada', 'cancelada_tarde')
    and not exists (select 1 from public.pruebas_usadas where reserva_id = new.id) then
    insert into public.pruebas_usadas (nombre, correo, dni, telefono, origen, reserva_id)
    select nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')), ''), p.email, p.dni, p.telefono, 'reserva', new.id
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reservas_anotar_prueba on public.reservas;
create trigger reservas_anotar_prueba
  after insert or update of estado on public.reservas
  for each row execute function public.anotar_prueba_usada();

-- ¿Ya ha gastado la clase de prueba? Esta cuenta u otra con el mismo teléfono (como antes),
-- o alguien del registro con el mismo correo, DNI o teléfono.
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
      from public.pruebas_usadas u
      join public.profiles yo on yo.id = p_user
      where (coalesce(u.correo, '') <> '' and lower(u.correo) = lower(coalesce(yo.email, '')))
         or (
           length(regexp_replace(coalesce(u.dni, ''), '[^0-9A-Za-z]', '', 'g')) >= 6
           and upper(regexp_replace(u.dni, '[^0-9A-Za-z]', '', 'g')) = upper(regexp_replace(coalesce(yo.dni, ''), '[^0-9A-Za-z]', '', 'g'))
         )
         or (
           length(regexp_replace(coalesce(u.telefono, ''), '[^0-9]', '', 'g')) >= 9
           and right(regexp_replace(u.telefono, '[^0-9]', '', 'g'), 9)
             = right(regexp_replace(coalesce(yo.telefono, ''), '[^0-9]', '', 'g'), 9)
         )
    );
$$;
