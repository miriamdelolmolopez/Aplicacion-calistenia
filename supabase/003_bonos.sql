-- Fase 4 · Parte B: bonos, pagos y movimientos
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

-- 1. CATÁLOGO DE BONOS (precios en céntimos, IVA incluido) ------------------
create table if not exists public.tipos_bono (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  servicio text not null check (servicio in ('grupal', 'individual', 'online')),
  clases int not null check (clases > 0),
  validez_dias int not null check (validez_dias > 0),
  precio_centimos int not null check (precio_centimos >= 0),
  requiere_pago boolean not null default false, -- true: solo se activa una vez pagado
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

-- 2. BONOS DE CADA PERSONA ---------------------------------------------------
-- Estados: en_cola (esperando), activo (el que se gasta), agotado, caducado, anulado.
-- Solo puede haber UN bono activo por persona y servicio; los demás esperan en cola.
create table if not exists public.bonos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo_bono_id uuid not null references public.tipos_bono (id) on delete restrict,
  servicio text not null,
  clases_total int not null check (clases_total > 0),
  clases_restantes int not null check (clases_restantes >= 0),
  validez_dias int not null check (validez_dias > 0),
  estado text not null default 'en_cola'
    check (estado in ('en_cola', 'activo', 'agotado', 'caducado', 'anulado')),
  activo_desde timestamptz,
  caduca_en timestamptz,
  nota text,
  creado_en timestamptz not null default now()
);

create unique index if not exists bonos_un_activo_por_servicio
  on public.bonos (user_id, servicio) where estado = 'activo';
create index if not exists bonos_user on public.bonos (user_id);

-- 3. PAGOS --------------------------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bono_id uuid references public.bonos (id) on delete set null,
  importe_centimos int not null check (importe_centimos >= 0),
  metodo text not null check (metodo in ('efectivo', 'bizum', 'transferencia', 'tarjeta')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'anulado')),
  nota text,
  creado_en timestamptz not null default now(),
  pagado_en timestamptz
);

create index if not exists pagos_user on public.pagos (user_id);
create index if not exists pagos_pendientes on public.pagos (estado) where estado = 'pendiente';

-- 4. HISTORIAL de cada bono (altas, ajustes, devoluciones, caducidad...) ------
create table if not exists public.movimientos_bono (
  id uuid primary key default gen_random_uuid(),
  bono_id uuid not null references public.bonos (id) on delete cascade,
  tipo text not null check (tipo in (
    'alta', 'activacion', 'reserva', 'devolucion', 'ajuste',
    'ampliacion', 'agotado', 'caducidad', 'anulacion'
  )),
  clases int not null default 0,
  dias int not null default 0,
  nota text,
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index if not exists movimientos_bono_bono on public.movimientos_bono (bono_id);

-- 5. DATOS INICIALES (tus precios) -------------------------------------------
insert into public.tipos_bono (nombre, servicio, clases, validez_dias, precio_centimos, orden)
values
  ('Clase suelta', 'grupal', 1, 30, 1500, 1),
  ('Mensual 4 clases', 'grupal', 4, 30, 5500, 2),
  ('Mensual 8 clases', 'grupal', 8, 30, 8000, 3),
  ('Mensual 12 clases', 'grupal', 12, 30, 11000, 4),
  ('Bono 10 clases (3 meses)', 'grupal', 10, 90, 13500, 5)
on conflict (nombre) do nothing;

-- 6. FUNCIONES (solo las usa la parte privada de la app) ---------------------

-- Pone en marcha el siguiente bono en cola, si no hay uno activo.
create or replace function public.activar_siguiente(p_user uuid, p_servicio text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  siguiente record;
begin
  if exists (
    select 1 from public.bonos
    where user_id = p_user and servicio = p_servicio and estado = 'activo'
  ) then
    return;
  end if;

  select b.* into siguiente
  from public.bonos b
  join public.tipos_bono t on t.id = b.tipo_bono_id
  where b.user_id = p_user
    and b.servicio = p_servicio
    and b.estado = 'en_cola'
    and b.clases_restantes > 0
    and (b.caduca_en is null or b.caduca_en > now())
    and (
      not t.requiere_pago
      or exists (
        select 1 from public.pagos p
        where p.bono_id = b.id and p.estado = 'pagado'
      )
    )
  order by b.creado_en
  limit 1;

  if not found then
    return;
  end if;

  update public.bonos
  set estado = 'activo',
      activo_desde = coalesce(activo_desde, now()),
      caduca_en = coalesce(caduca_en, now() + make_interval(days => siguiente.validez_dias))
  where id = siguiente.id;

  insert into public.movimientos_bono (bono_id, tipo, nota)
  values (siguiente.id, 'activacion', 'Empieza a contar');
end;
$$;

-- Pone al día los bonos: marca caducados y agotados y arranca los siguientes.
create or replace function public.refrescar_bonos(p_user uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  update public.bonos set estado = 'caducado'
  where estado = 'en_cola' and caduca_en <= now()
    and (p_user is null or user_id = p_user);

  for fila in
    select id from public.bonos
    where estado = 'activo' and caduca_en <= now()
      and (p_user is null or user_id = p_user)
  loop
    update public.bonos set estado = 'caducado' where id = fila.id;
    insert into public.movimientos_bono (bono_id, tipo, nota)
    values (fila.id, 'caducidad', 'Ha caducado');
  end loop;

  for fila in
    select id from public.bonos
    where estado = 'activo' and clases_restantes = 0
      and (p_user is null or user_id = p_user)
  loop
    update public.bonos set estado = 'agotado' where id = fila.id;
    insert into public.movimientos_bono (bono_id, tipo, nota)
    values (fila.id, 'agotado', 'Sin clases');
  end loop;

  for fila in
    select distinct user_id, servicio from public.bonos
    where estado = 'en_cola'
      and (p_user is null or user_id = p_user)
  loop
    perform public.activar_siguiente(fila.user_id, fila.servicio);
  end loop;
end;
$$;

-- Crea un bono para una persona (con su pago, pendiente o ya cobrado).
create or replace function public.crear_bono(
  p_user uuid,
  p_tipo uuid,
  p_metodo text,
  p_pagado boolean,
  p_nota text,
  p_admin uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo record;
  nuevo uuid;
begin
  select * into tipo from public.tipos_bono where id = p_tipo and activo;
  if not found then
    raise exception 'Tipo de bono no válido';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and rol = 'alumno') then
    raise exception 'La persona debe ser alumno';
  end if;

  insert into public.bonos (user_id, tipo_bono_id, servicio, clases_total,
                            clases_restantes, validez_dias, nota)
  values (p_user, tipo.id, tipo.servicio, tipo.clases, tipo.clases,
          tipo.validez_dias, nullif(p_nota, ''))
  returning id into nuevo;

  insert into public.pagos (user_id, bono_id, importe_centimos, metodo, estado, pagado_en, nota)
  values (p_user, nuevo, tipo.precio_centimos, p_metodo,
          case when p_pagado then 'pagado' else 'pendiente' end,
          case when p_pagado then now() else null end,
          nullif(p_nota, ''));

  insert into public.movimientos_bono (bono_id, tipo, clases, nota, creado_por)
  values (nuevo, 'alta', tipo.clases, tipo.nombre, p_admin);

  perform public.refrescar_bonos(p_user);
  return nuevo;
end;
$$;

-- Marca un pago pendiente como cobrado.
create or replace function public.marcar_pagado(p_pago uuid, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fila record;
begin
  update public.pagos
  set estado = 'pagado', pagado_en = now()
  where id = p_pago and estado = 'pendiente'
  returning * into fila;

  if not found then
    raise exception 'El pago no existe o ya no está pendiente';
  end if;

  if fila.bono_id is not null then
    insert into public.movimientos_bono (bono_id, tipo, nota, creado_por)
    values (fila.bono_id, 'ajuste', 'Pago cobrado', p_admin);
  end if;

  perform public.refrescar_bonos(fila.user_id);
end;
$$;

-- Suma o resta clases y/o amplía la caducidad de un bono (con nota).
create or replace function public.ajustar_bono(
  p_bono uuid,
  p_clases int,
  p_dias int,
  p_nota text,
  p_admin uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  nuevas int;
begin
  select * into b from public.bonos where id = p_bono for update;
  if not found then
    raise exception 'Bono no encontrado';
  end if;
  if b.estado = 'anulado' then
    raise exception 'El bono está anulado';
  end if;

  nuevas := b.clases_restantes + p_clases;
  if nuevas < 0 then
    raise exception 'No pueden quedar clases negativas';
  end if;

  update public.bonos
  set clases_restantes = nuevas,
      caduca_en = case
        when caduca_en is not null then caduca_en + make_interval(days => p_dias)
        else caduca_en
      end
  where id = p_bono;

  insert into public.movimientos_bono (bono_id, tipo, clases, dias, nota, creado_por)
  values (
    p_bono,
    case when p_dias <> 0 and p_clases = 0 then 'ampliacion'
         when p_clases > 0 then 'devolucion'
         else 'ajuste' end,
    p_clases, p_dias, nullif(p_nota, ''), p_admin
  );

  -- Si estaba agotado o caducado y vuelve a tener clases y fecha válida, se reabre.
  update public.bonos
  set estado = 'en_cola'
  where id = p_bono
    and estado in ('agotado', 'caducado')
    and clases_restantes > 0
    and caduca_en > now();

  perform public.refrescar_bonos(b.user_id);
end;
$$;

-- Anula un bono (por error, devolución del dinero, etc.).
create or replace function public.anular_bono(p_bono uuid, p_nota text, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  update public.bonos set estado = 'anulado'
  where id = p_bono and estado <> 'anulado'
  returning * into b;

  if not found then
    raise exception 'Bono no encontrado o ya anulado';
  end if;

  update public.pagos set estado = 'anulado'
  where bono_id = p_bono and estado = 'pendiente';

  insert into public.movimientos_bono (bono_id, tipo, nota, creado_por)
  values (p_bono, 'anulacion', nullif(p_nota, ''), p_admin);

  perform public.refrescar_bonos(b.user_id);
end;
$$;

revoke all on function public.activar_siguiente(uuid, text) from public, anon, authenticated;
revoke all on function public.refrescar_bonos(uuid) from public, anon, authenticated;
revoke all on function public.crear_bono(uuid, uuid, text, boolean, text, uuid) from public, anon, authenticated;
revoke all on function public.marcar_pagado(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ajustar_bono(uuid, int, int, text, uuid) from public, anon, authenticated;
revoke all on function public.anular_bono(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.activar_siguiente(uuid, text) to service_role;
grant execute on function public.refrescar_bonos(uuid) to service_role;
grant execute on function public.crear_bono(uuid, uuid, text, boolean, text, uuid) to service_role;
grant execute on function public.marcar_pagado(uuid, uuid) to service_role;
grant execute on function public.ajustar_bono(uuid, int, int, text, uuid) to service_role;
grant execute on function public.anular_bono(uuid, text, uuid) to service_role;

-- 7. SEGURIDAD ----------------------------------------------------------------
-- Cada persona solo VE sus bonos, pagos y movimientos; la administradora ve todo.
-- Nadie puede crear ni cambiar nada desde el navegador.
alter table public.tipos_bono enable row level security;
alter table public.bonos enable row level security;
alter table public.pagos enable row level security;
alter table public.movimientos_bono enable row level security;

revoke all on public.tipos_bono from anon, authenticated;
revoke all on public.bonos from anon, authenticated;
revoke all on public.pagos from anon, authenticated;
revoke all on public.movimientos_bono from anon, authenticated;

grant select on public.tipos_bono to authenticated;
grant select on public.bonos to authenticated;
grant select on public.pagos to authenticated;
grant select on public.movimientos_bono to authenticated;

drop policy if exists tipos_bono_ver on public.tipos_bono;
create policy tipos_bono_ver on public.tipos_bono
  for select to authenticated using (true);

drop policy if exists bonos_ver on public.bonos;
create policy bonos_ver on public.bonos
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists pagos_ver on public.pagos;
create policy pagos_ver on public.pagos
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists movimientos_ver on public.movimientos_bono;
create policy movimientos_ver on public.movimientos_bono
  for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1 from public.bonos b
      where b.id = bono_id and b.user_id = (select auth.uid())
    )
  );
