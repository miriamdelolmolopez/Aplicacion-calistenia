-- Leads compartidos entre todas las administradoras de CalisCoach.
-- Pégalo ENTERO en el editor SQL de Supabase de CalisCoach (proyecto real) y pulsa Run.
-- Se puede ejecutar más de una vez sin problema. No borra leads ni notas: solo los pasa a la cuenta de la entrenadora principal.
--
-- La entrenadora principal es la administradora MÁS ANTIGUA (en CalisCoach, Miriam). Desde ahora todos los leads,
-- estados, tipos, etiquetas y conexiones son suyos, y cualquier administradora (por ejemplo Alberto) los ve y edita.

-- 1. Cualquier administradora puede LEER todo lo de Leads (antes solo lo suyo) ----------------------------------------
drop policy if exists leads_estados_ver on public.leads_estados;
create policy leads_estados_ver on public.leads_estados for select to authenticated using ((select public.es_admin()));
drop policy if exists leads_etiquetas_ver on public.leads_etiquetas;
create policy leads_etiquetas_ver on public.leads_etiquetas for select to authenticated using ((select public.es_admin()));
drop policy if exists leads_tipos_ver on public.leads_tipos;
create policy leads_tipos_ver on public.leads_tipos for select to authenticated using ((select public.es_admin()));
drop policy if exists leads_conexiones_ver on public.leads_conexiones;
create policy leads_conexiones_ver on public.leads_conexiones for select to authenticated using ((select public.es_admin()));
drop policy if exists leads_ver on public.leads;
create policy leads_ver on public.leads for select to authenticated using ((select public.es_admin()));
drop policy if exists leads_notas_ver on public.leads_notas;
create policy leads_notas_ver on public.leads_notas for select to authenticated using ((select public.es_admin()));

-- 2. Lo que ya tenían otras administradoras pasa a la cuenta de la entrenadora principal -----------------------------
do $$
declare
  jefa uuid;
begin
  select id into jefa from public.profiles where rol = 'admin' order by creado_en asc limit 1;
  if jefa is null then
    return;
  end if;

  -- Estados, tipos y etiquetas de otras administradoras que la entrenadora principal NO tiene (por nombre): pasan a ser suyos.
  update public.leads_estados e set entrenador_id = jefa, orden = e.orden + 100
    where e.entrenador_id <> jefa
      and not exists (select 1 from public.leads_estados x where x.entrenador_id = jefa and lower(x.nombre) = lower(e.nombre));
  update public.leads_tipos t set entrenador_id = jefa, orden = t.orden + 100
    where t.entrenador_id <> jefa
      and not exists (select 1 from public.leads_tipos x where x.entrenador_id = jefa and lower(x.nombre) = lower(t.nombre));
  update public.leads_etiquetas t set entrenador_id = jefa, orden = t.orden + 100
    where t.entrenador_id <> jefa
      and not exists (select 1 from public.leads_etiquetas x where x.entrenador_id = jefa and lower(x.nombre) = lower(t.nombre));

  -- Los leads de otras administradoras: se les busca el estado, el tipo y las etiquetas equivalentes (por nombre) de la entrenadora principal.
  update public.leads l set
    estado_id = coalesce(
      (select o.id from public.leads_estados a join public.leads_estados o on lower(o.nombre) = lower(a.nombre) and o.entrenador_id = jefa where a.id = l.estado_id),
      l.estado_id),
    tipo_id = case when l.tipo_id is null then null else coalesce(
      (select o.id from public.leads_tipos a join public.leads_tipos o on lower(o.nombre) = lower(a.nombre) and o.entrenador_id = jefa where a.id = l.tipo_id),
      l.tipo_id) end,
    etiqueta_ids = coalesce(
      (select array_agg(o.id) from public.leads_etiquetas a join public.leads_etiquetas o on lower(o.nombre) = lower(a.nombre) and o.entrenador_id = jefa where a.id = any (l.etiqueta_ids)),
      '{}'::uuid[])
    where l.entrenador_id <> jefa;
  update public.leads_notas set entrenador_id = jefa where entrenador_id <> jefa;
  update public.leads set entrenador_id = jefa where entrenador_id <> jefa;

  -- Conexiones de formularios de las demás administradoras (siguen funcionando con la misma dirección).
  update public.leads_conexiones set entrenador_id = jefa where entrenador_id <> jefa;

  -- Lo que queda de otras administradoras ya está repetido en la lista de la entrenadora principal y nada lo usa.
  delete from public.leads_estados where entrenador_id <> jefa;
  delete from public.leads_tipos where entrenador_id <> jefa;
  delete from public.leads_etiquetas where entrenador_id <> jefa;
end $$;

notify pgrst, 'reload schema';
