-- Color de cada tipo de clase (para el calendario de «Mis reservas»).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run.
-- No borra datos: solo añade una columna y da un color distinto a cada tipo que ya existe.
-- Se puede cambiar desde Administración > Clases > Tipos de clase.

alter table public.tipos_clase add column if not exists color text;

alter table public.tipos_clase drop constraint if exists tipos_clase_color_formato;
alter table public.tipos_clase
  add constraint tipos_clase_color_formato check (color is null or color ~* '^#[0-9a-f]{6}$');

with paleta as (
  select array['#5A5E3B', '#B5593C', '#3F6A8A', '#9A6F1C', '#7A4B7A', '#2F7F76', '#B8627D', '#7B5B3E'] as colores
),
ordenados as (
  select id, servicio, row_number() over (order by creado_en, nombre) as n
  from public.tipos_clase
  where color is null
)
update public.tipos_clase t
set color = case
  when o.servicio = 'individual' then '#2B2B2A'
  else (select colores[((o.n - 1) % 8)::int + 1] from paleta)
end
from ordenados o
where t.id = o.id;
