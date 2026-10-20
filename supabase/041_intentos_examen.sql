-- Historial del examen de Aprende: se guarda el resultado de cada examen terminado.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos existentes.

create table if not exists public.intentos_examen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  aciertos int not null check (aciertos >= 0),
  total int not null check (total between 1 and 200),
  creado_en timestamptz not null default now(),
  check (aciertos <= total)
);

create index if not exists intentos_examen_usuario on public.intentos_examen (user_id, creado_en desc);

alter table public.intentos_examen enable row level security;
revoke all on public.intentos_examen from anon, authenticated;
grant select, insert on public.intentos_examen to authenticated;

-- Cada persona guarda y ve solo los suyos; la administradora ve todos.
drop policy if exists intentos_ver on public.intentos_examen;
create policy intentos_ver on public.intentos_examen for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

drop policy if exists intentos_guardar on public.intentos_examen;
create policy intentos_guardar on public.intentos_examen for insert to authenticated
  with check (user_id = auth.uid());
