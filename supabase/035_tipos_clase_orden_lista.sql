-- Tipos de clase: orden de aparición, color de letra y lista de espera sí o no.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No borra datos de nadie.

alter table public.tipos_clase add column if not exists orden int not null default 0;
alter table public.tipos_clase add column if not exists color_texto text;
alter table public.tipos_clase drop constraint if exists tipos_clase_color_texto_formato;
alter table public.tipos_clase
  add constraint tipos_clase_color_texto_formato check (color_texto is null or color_texto ~* '^#[0-9a-f]{6}$');
alter table public.tipos_clase add column if not exists lista_espera boolean not null default true;

-- Orden inicial: por nombre, de 10 en 10 (así se pueden intercalar otros).
update public.tipos_clase t
set orden = r.n * 10
from (select id, row_number() over (order by nombre) as n from public.tipos_clase) r
where t.id = r.id and t.orden = 0;

-- Apuntarse a la lista de espera: solo si el tipo de clase la permite.
create or replace function public.unirse_lista_espera(p_user uuid, p_sesion uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  t record;
  b record;
  ocupadas int;
  posicion int;
begin
  select * into s from public.sesiones_clase where id = p_sesion for update;
  if not found then
    raise exception 'Clase no encontrada';
  end if;
  if s.estado <> 'programada' then
    raise exception 'La clase está cancelada';
  end if;
  if s.empieza_en <= now() then
    raise exception 'La clase ya ha empezado';
  end if;

  select * into t from public.tipos_clase where id = s.tipo_id;
  if not t.lista_espera then
    raise exception 'Esta clase no tiene lista de espera';
  end if;

  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'Solo los alumnos pueden apuntarse a la lista de espera';
  end if;
  if exists (
    select 1 from public.reservas
    where sesion_id = p_sesion and user_id = p_user and estado = 'reservada'
  ) then
    raise exception 'Ya tienes plaza en esta clase';
  end if;

  select count(*) into ocupadas
  from public.reservas where sesion_id = p_sesion and estado = 'reservada';
  if ocupadas < s.plazas then
    raise exception 'La clase todavía tiene plazas libres';
  end if;

  perform public.refrescar_bonos(p_user);
  select * into b from public.bonos
  where user_id = p_user and servicio = t.servicio and estado = 'activo';
  if not found then
    raise exception 'No tienes ningún bono activo';
  end if;
  if b.caduca_en is not null and b.caduca_en < s.empieza_en then
    raise exception 'Tu bono caduca antes de esta clase';
  end if;

  insert into public.lista_espera (sesion_id, user_id)
  values (p_sesion, p_user)
  on conflict (sesion_id, user_id) do nothing;

  select count(*) into posicion
  from public.lista_espera l
  where l.sesion_id = p_sesion
    and l.creado_en <= (
      select l2.creado_en from public.lista_espera l2
      where l2.sesion_id = p_sesion and l2.user_id = p_user
    );
  return posicion;
end;
$$;
