-- Archivar días de una rutina: un día archivado no lo ve la persona (ni sus ejercicios), pero tú lo sigues viendo y puedes desarchivarlo.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run. No borra nada.

alter table public.rutina_sesiones add column if not exists archivada boolean not null default false;

-- La persona solo ve las sesiones no archivadas de sus rutinas.
create or replace function public.sesion_visible(p_sesion uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rutina_sesiones s
    where s.id = p_sesion and not s.archivada and public.rutina_visible(s.rutina_id)
  );
$$;

-- Y solo los ejercicios que llevan sus sesiones no archivadas.
create or replace function public.ejercicio_visible(p_ejercicio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.rutina_items i
    join public.rutina_sesiones s on s.id = i.sesion_id
    where i.ejercicio_id = p_ejercicio and not s.archivada and public.rutina_visible(s.rutina_id)
  );
$$;

drop policy if exists rutina_sesiones_ver on public.rutina_sesiones;
create policy rutina_sesiones_ver on public.rutina_sesiones
  for select to authenticated
  using ((select public.es_admin()) or ((select public.rutina_visible(rutina_id)) and not archivada));
