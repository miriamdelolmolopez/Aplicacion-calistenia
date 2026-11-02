-- Archivar personas en lugar de borrarlas: desaparecen de las listas y no pueden entrar, pero sus datos y pagos se conservan.
-- Una persona archivada tiene el tipo «archivado» (y se guarda el que tenía, para poder desarchivarla).

alter table public.profiles
  add column if not exists rol_anterior text,
  add column if not exists archivado_en timestamptz;

-- Se permite el valor «archivado» en el tipo de persona.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%''invitado''%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_rol_check check (rol in ('admin', 'alumno', 'invitado', 'archivado'));
