-- 1) Registro cerrado: solo entran las personas que Miriam da de alta, o quien llega con el código del link de prueba.
insert into public.ajustes (clave, valor) values ('registro_abierto', 'false') on conflict (clave) do nothing;

create or replace function public.bloquear_registro_cerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  abierto text := coalesce((select valor from public.ajustes where clave = 'registro_abierto'), 'true');
  activa text := (select valor from public.ajustes where clave = 'prueba_activa');
  codigo text := (select valor from public.ajustes where clave = 'prueba_codigo');
begin
  if abierto = 'true' then
    return new;
  end if;
  -- Altas hechas por Miriam (invitación).
  if new.invited_at is not null then
    return new;
  end if;
  -- Google: lo comprueba la propia app al entrar.
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    return new;
  end if;
  -- Quien llega con el código vigente del link de prueba.
  if activa = 'true' and coalesce(codigo, '') <> ''
     and upper(coalesce(new.raw_user_meta_data ->> 'codigo', '')) = upper(codigo) then
    return new;
  end if;
  raise exception 'El registro está cerrado';
end;
$$;

drop trigger if exists bloquear_registro_cerrado on auth.users;
create trigger bloquear_registro_cerrado
  before insert on auth.users
  for each row execute function public.bloquear_registro_cerrado();

-- 2) Más avisos que cada persona puede apagar.
alter table public.profiles add column if not exists avisos_recordatorio boolean not null default true;
alter table public.profiles add column if not exists avisos_novedades boolean not null default true;
