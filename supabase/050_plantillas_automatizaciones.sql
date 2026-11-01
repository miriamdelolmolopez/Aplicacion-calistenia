-- Nuevas plantillas de automatizaciones: echamos de menos, bienvenida, recordatorio de clase, bono agotado y aniversario.
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run (sin activar RLS).
-- No cambia ni borra ningún dato: solo amplía la lista de automatizaciones y de avisos permitidos.

-- 1) Las automatizaciones que se pueden crear (se quitan las comprobaciones antiguas sobre «clave» y se pone la nueva lista).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.automatizaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%clave%'
  loop
    execute format('alter table public.automatizaciones drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.automatizaciones
  add constraint automatizaciones_clave_check
  check (clave in (
    'prueba_recordatorio', 'prueba_despues', 'bono_caduca', 'cumple',
    'echamos_menos', 'bienvenida', 'recordatorio_clase', 'bono_agotado', 'aniversario'
  ));

-- 2) Los avisos que se apuntan para no enviar dos veces el mismo correo.
alter table public.avisos_enviados drop constraint if exists avisos_enviados_tipo_check;
alter table public.avisos_enviados
  add constraint avisos_enviados_tipo_check
  check (tipo in (
    'bono_caduca', 'minimo_clase', 'prueba_recordatorio', 'prueba_despues', 'cumple',
    'echamos_menos', 'bienvenida', 'recordatorio_clase', 'bono_agotado', 'aniversario'
  ));
